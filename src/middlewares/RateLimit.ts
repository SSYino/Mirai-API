import Express from "express";

import rateLimit from "express-rate-limit";
import Logger from "../libs/Logger";

class RateLimit {
    public static init(_express: any) {
        //_express.use(this.default);
        return _express;
    }

    public static onDefaultLimitReachedHandler(req: any, res: any, options: any) {
        Logger.log("alert", "Somebody reached the default rate limit");
    }

    public static onDefaultAPILimitReachedHandler(req: any, res: any, options: any) {
        Logger.log("alert", "Somebody reached the API default rate limit");
    }

    public static handler(req: any, res: any) {
        res.status(429).json({
            success: false,
            error: "You are being rate-limited",
        });
    }

    // TODO: Use keyGenerator and change req.ip to IP the proxy passed
    // https://www.npmjs.com/package/express-rate-limit

    // 1000 request per 1 minute
    public static default = rateLimit({
        windowMs: 1 * 60 * 1000,
        max: 1000,
        handler: RateLimit.handler,
        onLimitReached: RateLimit.onDefaultLimitReachedHandler
    });

    // 100 request per 1 minute
    public static defaultAPI = rateLimit({
        windowMs: 1 * 60 * 1000,
        max: 100,
        handler: RateLimit.handler,
        onLimitReached: RateLimit.onDefaultAPILimitReachedHandler
    });

}

export default RateLimit;
