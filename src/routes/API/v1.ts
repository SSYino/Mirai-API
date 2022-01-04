import * as express from 'express';
import Environment from '../../providers/Environment'

import Login from '../../controllers/API/v1/Auth/Login';

import RateLimit from '../../middlewares/RateLimit';

import Sessions from '../../middlewares/Sessions';
import Profile from '../../controllers/API/v1/Users/Profile';
import Classes from '../../controllers/API/v1/Classroom/Classes';
import Assignments from '../../controllers/API/v1/Classroom/Assignments';
import Calendar from '../../controllers/API/v1/Classroom/Calendar';
import Meetings from '../../controllers/API/v1/Classroom/Meetings';
//import CourseWorks from '../../controllers/API/v1/Classrooms/CourseWorks';
import AdminUsers from '../../controllers/API/v1/Admin/Users';
// import AdminSessions from '../../controllers/API/v1/Admin/Sessions';
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

router.get('/users/:id/profile', RateLimit.defaultAPI, Sessions.isAuthenticated, Profile.perform);

router.get('/admin/users', RateLimit.defaultAPI, Sessions.isAuthenticated, Users.isAdmin, AdminUsers.perform);
// router.get('/admin/sessions', RateLimit.defaultAPI, Sessions.isAuthenticated, Users.isAdmin, AdminSessions.perform);

router.get('/classroom/classes', RateLimit.defaultAPI, Sessions.isAuthenticated, Classes.perform);
router.get('/classroom/assignments', RateLimit.defaultAPI, Sessions.isAuthenticated, Assignments.perform);
router.get('/classroom/calendar', RateLimit.defaultAPI, Sessions.isAuthenticated, Calendar.perform)
router.get('/classroom/meetings', RateLimit.defaultAPI, Sessions.isAuthenticated, Meetings.perform);

//router.get('/classrooms/courseworks', RateLimit.defaultAPI, Sessions.isAuthenticated, CourseWorks.perform);


export default router;