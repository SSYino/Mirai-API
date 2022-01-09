import RequestHelper from "../../../../libs/RequestHelper";

import Logger from "../../../../libs/Logger";

import path from "path";
import fs from "fs";

import HTTP_STATUS from "../../../../libs/HTTPStatus";

class DebugLogs {
    public static async perform(req: any, res: any, next: any) {
        Promise.resolve().then(async () => {

            const pathToLogs = path.join(process.cwd(), '/logs/all.log')
            const pathToErrorLogs = path.join(process.cwd(), '/logs/error.log')

            const logs = (() => {
                const output = [];
                const raw = fs.readFileSync(pathToLogs).toString("utf8").split('\n');
                for (const line of raw) {
                    if(line === '') continue;
                    try {
                        output.push(JSON.parse(line.replace(new RegExp('\\r' + '$'), '')))
                    } catch (err) {

                    }
                }
                return output;
            });
            const errorLogs = (() => {
                const output = [];
                const raw = fs.readFileSync(pathToErrorLogs).toString("utf8").split('\n');
                for (const line of raw) {
                    if(line === '') continue;
                    try {
                        output.push(JSON.parse(line.replace(new RegExp('\\r' + '$'), '')))
                    } catch (err) {

                    }
                }
                return output;
            });

            
            let userData: any = {
                data: {
                    logs: logs(),
                    errorLogs: errorLogs()
                }
            };

            return res.status(HTTP_STATUS.OK).json(userData);
            
        }).catch(next);
    }
}

export default DebugLogs;