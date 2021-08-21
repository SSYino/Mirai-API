import * as path from "path";
import * as dotenv from "dotenv";

import Validator from "validator";

import Logger from "../libs/Logger";

const requiredENV = [
    'NODE_ENV',
    'WEB_HOST', 'WEB_PORT',
    'SESSION_TOKEN_LENGTH', 'SESSION_TOKEN_SHA256_KEY',
];

class Environment {

    public init(): void {
        dotenv.config({ path: path.resolve(__dirname, "../../.env") });

        for (let param of requiredENV) {
            if (this.isUndefinedOrEmpty(process.env[param]))
                throw new Error(`.env ${param} is undefined`);
        }

        // NODE_ENV Checks
        if (this.get().NODE_ENV != "production" && this.get().NODE_ENV != "development")
            throw new Error('.env NODE_ENV must be either "production" or "development"');
            
        // WEB_HOST Checks
        if(!Validator.isIP(this.get().WEB_HOST))
            throw new Error('.env WEB_HOST must be an IP address');

        // WEB_PORT Checks
        if(!Validator.isPort(this.get().WEB_PORT))
            throw new Error('.env WEB_PORT must be a valid port number');

        // SESSION_TOKEN_LENGTH Checks
        if(!Validator.isNumeric(this.get().SESSION_TOKEN_LENGTH))
            throw new Error('.env SESSION_TOKEN_LENGTH must be a valid port number');

        // TODO: SESSION_TOKEN_SHA256_KEY Checks
        // TODO: Add checks for Google APIs

        Logger.log('info', `Running in ${process.env.NODE_ENV} environment`);
    }

    public get(): any {

        const NODE_ENV = process.env.NODE_ENV;

        const WEB_HOST = process.env.WEB_HOST;
        const WEB_PORT = process.env.WEB_PORT;

        
        const SESSION_TOKEN_LENGTH = process.env.SESSION_TOKEN_LENGTH;
        const SESSION_TOKEN_SHA256_KEY = process.env.SESSION_TOKEN_SHA256_KEY;

        const GOOGLEAPI = {
            "web": {
              "client_id": process.env.GOOGLE_CLIENT_ID,
              "project_id": process.env.GOOGLE_PROJECT_ID,
              "auth_uri": process.env.GOOGLE_AUTH_URI,
              "token_uri": process.env.GOOGLE_TOKEN_URI,
              "auth_provider_x509_cert_url": process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
              "client_secret": process.env.GOOGLE_CLIENT_SECRET,
              "redirect_uris": [process.env.GOOGLE_REDIRECT_URIS],
              "javascript_origins": [process.env.GOOGLE_JAVASCRIPT_ORIGINS]
            }
        }
          
        return {
            NODE_ENV,

            WEB_HOST,
            WEB_PORT,
       
            SESSION_TOKEN_LENGTH,
            SESSION_TOKEN_SHA256_KEY,

            GOOGLEAPI
        };
    }

    private isUndefinedOrEmpty(value: String | undefined): boolean {
        if(typeof value === 'undefined')
            return true;

        if(value === undefined)
            return true;

        if(value === '')
            return true;

        return false;
    }

}

export default new Environment();
