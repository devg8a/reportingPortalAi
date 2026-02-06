interface Config {
    MODE: string | undefined;
    PORT: string | number;
    PREFIX: string | undefined;
    HOST: string | undefined;
    secret: string | undefined;
    MONGODB_URI: string | undefined;
}

const config: Config = {
    MODE: process.env.SERVER || process.env.NODE_ENV,
    PORT: process.env.PORT || 4000,
    PREFIX: process.env.PREFIX,
    HOST: process.env.HOST,
    secret: process.env.secret,
    MONGODB_URI: process.env.MONGODB_URI,
};

export default config;
