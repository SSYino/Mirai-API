import * as express from 'express';
import Environment from '../../providers/Environment'

import Login from '../../controllers/API/v1/Auth/Login';

import RateLimit from '../../middlewares/RateLimit';

import Sessions from '../../middlewares/Sessions';
import Me from '../../controllers/API/v1/Users/Me';
import Courses from '../../controllers/API/v1/Classrooms/Courses';
import CourseWorks from '../../controllers/API/v1/Classrooms/CourseWorks';
import AdminUsers from '../../controllers/API/v1/Admin/Users';
import Users from '../../middlewares/Users';


const router = express.Router();

let isDevEnv = (req: any, res: any, next: any) => {
    if(Environment.get().NODE_ENV == 'development') {
        return next();
    }
    else {
        return res.sendStatus(403);
    }
};


router.get('/auth/login', RateLimit.defaultAPI, Login.perform);

router.get('/users/me', RateLimit.defaultAPI, Sessions.isAuthenticated, Me.perform);

router.get('/admin/users', RateLimit.defaultAPI, Sessions.isAuthenticated, Users.isAdmin, AdminUsers.perform);

router.get('/classrooms/courses', RateLimit.defaultAPI, Sessions.isAuthenticated, Courses.perform);
router.get('/classrooms/courseworks', RateLimit.defaultAPI, Sessions.isAuthenticated, CourseWorks.perform);


export default router;