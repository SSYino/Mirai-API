import express, { Application } from 'express';
import Logger from '../libs/Logger';
import apiv1Router from '../routes/API/v1';

import path from 'path';

class Routes {

    public mountWeb(_express: express.Application): Application {
        Logger.log('info', 'Mounting Web routes');

        _express.use(express.static(path.join(__dirname, '../../' ,'client')));

        _express.get('*', function (req, res) {
            res.sendFile(path.join(__dirname, '../../' ,'client', 'index.html'));
        });

        return _express;
    }

    public mountAPI(_express: express.Application): Application {
        Logger.log('info', 'Mounting API routes');

        _express.use('/api/v1/', apiv1Router);

        return _express;
    }

}

export default new Routes;