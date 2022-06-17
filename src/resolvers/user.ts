import { User } from "../entities/user";
import { MyContext } from "src/types";
import argon2 from "argon2"
import { Arg, Ctx, Field, InputType, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { EntityManager } from "@mikro-orm/postgresql";
import { COOKIE_NAME } from "../entities/constants";

@InputType()
class UserNamePasswordInput {
    @Field()
    username: string
    @Field()
    password: string
}

@ObjectType()
class FieldError {
    @Field()
    field: string
    @Field()
    message: string
}

@ObjectType()
class UserResponse {
    @Field(() => [FieldError], {nullable: true})
    errors?: FieldError[]
    @Field(() => User, {nullable: true})
    user?: User
}

@Resolver()
export class UserResolver {
    @Query(() => User, {nullable: true})
        async me(
            @Ctx() {req, em}: MyContext
        ){
            // Not logged in
            if (!req.session.userId) {
                return null
            }
            const user = await em.findOne(User,  {id: req.session.userId });
            return user
        }
    @Mutation(() => UserResponse)
    async register(
        
        //GraphQL infers this type
        @Arg('options') options: UserNamePasswordInput,
        @Ctx() {em, req}: MyContext
    ): Promise<UserResponse>{
        if (options.username.length <= 2){
            return {
                errors: [{
                    field: 'username',
                    message: 'Username is too short. 3 character minimum.'
                }]
            }
        }

        if (options.password.length <= 4){
            return {
                errors: [{
                    field: 'password',
                    message: 'Password is too short. 5 character minimum.'
                }]
            }
        }

        const hashedPassword = await argon2.hash(options.password)
        let user
    try{
        const result = await (em as EntityManager)
        .createQueryBuilder(User)
        .getKnexQuery()
        .insert(
            {
                username: options.username.toLowerCase(),
                password: hashedPassword,
                created_at: new Date(),
                updated_at: new Date()
            })
        .returning("*")
        user = result[0]
    } catch(err) {
        console.log(err.code)
        if (err.detail.includes("already exists")) {
            //Duplicate username code
            return {
                errors: [{
                    field: 'username',
                    message: 'Username already exists'
                }]
            }
        }
        
    }
    //Store the cookie that keeps the user logged in
    req.session.userId = user.id;
    return { user }
    }
    @Mutation(() => UserResponse)
    async login(
        //GraphQL infers this type
        @Arg('options') options: UserNamePasswordInput,
        @Ctx() {em, req}: MyContext,
    ): Promise<UserResponse>{
        const user = await em.findOne(User, { username: options.username.toLowerCase() } )
        if (!user) {
            return {
                errors: [{
                    field: 'username',
                    message: 'Username does not exist'
                }]
            }
        }

        const valid = await argon2.verify(user.password, options.password)

        if (!valid) {
            return {
                errors: [{
                    field: 'password',
                    message: 'Incorrect password'
                }]
            }
        }
        //Store the cookie that keeps the user logged in
        req.session.userId = user.id;
        
        return {
            user,
        }
    }

    @Mutation(() => Boolean)
    logout(@Ctx() {req, res}: MyContext) {
        return new Promise (resolve => req.session.destroy(err => {
            
            if (err) {
                console.log(err)
                resolve(false)
                return
            }
            res.clearCookie(COOKIE_NAME)
            resolve(true)
        }))
    }
}