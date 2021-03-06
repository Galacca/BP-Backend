import 'reflect-metadata'
import { MikroORM } from "@mikro-orm/core";
import { COOKIE_NAME, __prod__ } from "./entities/constants"
import mikroConfig from "./mikro-orm.config";
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql'
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from './resolvers/user';
import redis from 'redis'
import session from 'express-session'
import connectRedis from 'connect-redis'
import { MyContext } from './types';

const main = async () => {

    const orm = await MikroORM.init(mikroConfig);
    await orm.getMigrator().up();
    // const post = orm.em.create(Post, {title: 'my first post'})
    // await orm.em.persistAndFlush(post);

    const app = express();

    const RedisStore = connectRedis(session)
    const redisClient = redis.createClient()
   
    app.use(
        session({
          name: COOKIE_NAME,
          store: new RedisStore({
               client: redisClient,
               disableTouch: true
             }),
             cookie: {
                 maxAge: 1000 * 60 * 60 * 24 * 365, //1 year
                 httpOnly: true,
                 sameSite: 'lax', //csrf
                 secure: __prod__ // cookie only works in https, localhost is not https
             },
          saveUninitialized: false,
          secret: 'blackmetalankka',
          resave: false,
        })
      )

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostResolver, UserResolver],
            validate: false,
        }),
        context: ({req, res}): MyContext => ({ em: orm.em, req, res })
    });

    apolloServer.applyMiddleware({ app, cors: {origin: 'http://localhost:3000', credentials: true}, })
    app.listen(4000, () => {
       console.log('server started on localhost:4000')
    })
}

main().catch((err) => {
    console.error(err);
});
