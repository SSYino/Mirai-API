import Logger from "../libs/Logger";

class ExpressExceptionHandler {
    public static errorLogger(err: any, req: any, res: any, next: any) {
        Logger.log('error', err.stack);
        res.status(500).send('Something broke!');
    }
}

export default ExpressExceptionHandler;