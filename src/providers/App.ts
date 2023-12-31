import Logger from '../libs/Logger';

import Environment from './Environment';
import Express from './Express';
import GoogleAPI from './GoogleAPI';
import Prisma from './Prisma';

class App {

    public loadENV(): void {
        Logger.log('info', 'Loading environment');
        Environment.init();
    }

    public loadExpress(): void {
        Logger.log('info', 'Loading Express');
        Express.init();
    }

    public endExpress(): void {
        Logger.log('info', 'Ending Express');
        Express.end();
    }

    public loadPrisma(): void {
        Logger.log('info', 'Loading Prisma');
        Prisma.init();
    }

    public loadGoogleAPI(): void {
        Logger.log('info', 'Loading GoogleAPI');
        GoogleAPI.init();
    }

}

export default new App;