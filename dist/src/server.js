"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dayjs_1 = __importDefault(require("dayjs"));
const fs_1 = __importDefault(require("fs"));
const normalizr_1 = require("normalizr");
const bCrypt = require('bcrypt');
const faker = require('faker');
const app = express_1.default();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { fork } = require('child_process')
const compression  = require('compression')
const winston = require('winston')

// CLUSTER
const cluster = require('cluster')
const numCPUs = require('os').cpus().length
// MONGO
const mongoStore = require('connect-mongo');
const mongoose = require('mongoose');
// USER MODEL:
const userModel = require('../src/userModel');
// CONNECT-MONGO OPTIONS
const advancedOptions = { useNewUrlParser: true, useUnifiedTopology: true };
// PASSPORT\
const passport = require('passport');
const passport_local_1 = require("passport-local");
const passport_facebook_1 = require("passport-facebook");
const FACEBOOK_CLIENT_ID = '1454555808238584';
const FACEBOOK_CLIENT_SECRET = 'c445cd3d4110314aa7ce38e1a3946395';
// MIDDLEWARES:
app.use(compression())
app.use(cookieParser());
app.use(express_1.default.json());
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        maxAge: 600000
    },
    //CONEXION A MONGO-ATLAS
    store: mongoStore.create({
        mongoUrl: 'mongodb+srv://emma:borinda@cluster0.ydcxa.mongodb.net/users?retryWrites=true&w=majority',
        mongoOptions: advancedOptions,
        //  CON TTL NO FUNCIONA, EN MONGO'ATLAS FIGURA COMO: "expires": null
        ttl: 14 * 24 * 60 * 60,
    }),
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use('login', new passport_local_1.Strategy({
    passReqToCallback: true
}, function (req, username, password, done) {
    debugger;
    // check in mongo if a user with username exists or not
    userModel.findOne({ 'username': username }, function (err, user) {
        // In case of any error, return using the done method
        if (err) {
            console.log(err);
            return done(err);
        }
        // Username does not exist, log error & redirect back
        if (!user) {
            console.log('User Not Found with username ' + username);
            console.log('message', 'User Not found.');
            return done(null, false);
        }
        // User exists but wrong password, log the error 
        if (!isValidPassword(user, password)) {
            console.log('Invalid Password');
            console.log('message', 'Invalid Password');
            console.log("username: ", username);
            console.log("password: ", password);
            return done(null, false);
        }
        // User and password both match, return user from 
        // done method which will be treated like success
        return done(null, user);
    });
}));
passport.use(new passport_facebook_1.Strategy({
    clientID: FACEBOOK_CLIENT_ID,
    clientSecret: FACEBOOK_CLIENT_SECRET,
    callbackURL: 'http://localhost:7778/auth/facebook/callback',
}, function (accessToken, refreshToken, profile, done) {
    console.log(profile);
    // let userProfile = profile;
    //console.dir(userProfile, {depth: 4, colors: true})
    // return done(null, userProfile);
    const findOrCreateUser = function () {
        // find a user in Mongo with provided username
        userModel.findOne({ 'facebookId': profile.id }, function (err, user) {
            // In case of any error return
            if (err) {
                console.log('Error in SignUp: ' + err);
                return done(err);
            }
            // already exists
            if (user) {
                console.log('User already exists');
                console.log('message', 'User Already Exists');
                return done(null, false);
            }
            else {
                // if there is no user with that email
                // create the user
                let newUser = new userModel();
                // set the user's local credentials
                newUser.facebookId = profile.id;
                newUser.username = profile.displayName;
                // save the user
                newUser.save(function (err) {
                    if (err) {
                        console.log('Error in Saving user: ' + err);
                        throw err;
                    }
                    console.log('User Registration succesful');
                    return done(null, newUser);
                });
            }
        });
    };
    // Delay the execution of findOrCreateUser and execute 
    // the method in the next tick of the event loop
    process.nextTick(findOrCreateUser);
}));
var isValidPassword = function (user, password) {
    console.log('isValidPassword. user: ', user, typeof user.password);
    console.log('isValidPassword. password: ', password, typeof password);
    console.log("bcrypt: ", bCrypt.compareSync(password, user.password));
    //BCRYPT ESTA EVALUANDO SIEMPRE COMO FALSO AUNQUE LOS PASSWORDS COINCIDAN
    // return bCrypt.compareSync(password, user.password);
    return (user.password === password);
};
passport.use('register', new passport_local_1.Strategy({
    passReqToCallback: true
}, function (req, username, password, done) {
    const findOrCreateUser = function () {
        // find a user in Mongo with provided username
        userModel.findOne({ 'username': username }, function (err, user) {
            // In case of any error return
            if (err) {
                console.log('Error in SignUp: ' + err);
                return done(err);
            }
            // already exists
            if (user) {
                console.log('User already exists');
                console.log('message', 'User Already Exists');
                return done(null, false);
            }
            else {
                // if there is no user with that email
                // create the user
                let newUser = new userModel();
                // set the user's local credentials
                newUser.username = username;
                newUser.password = createHash(password);
                // save the user
                newUser.save(function (err) {
                    if (err) {
                        console.log('Error in Saving user: ' + err);
                        throw err;
                    }
                    console.log('User Registration succesful');
                    return done(null, newUser);
                });
            }
        });
    };
    // Delay the execution of findOrCreateUser and execute 
    // the method in the next tick of the event loop
    process.nextTick(findOrCreateUser);
}));
// Generates hash using bCrypt
var createHash = function (password) {
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
};
// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function (user, done) {
    done(null, user._id);
});
passport.deserializeUser(function (id, done) {
    userModel.findById(id, function (err, user) {
        done(err, user);
    });
});
const author = new normalizr_1.schema.Entity("author");
const text = new normalizr_1.schema.Entity('text', {
    author: author
});
const mensaje = new normalizr_1.schema.Entity('msg', {
    author: author,
    text: text
});
let user = '';
let obj = "";
let objWithNormedMsg = '';
// SOCKET.IO
io.on('connection', (socket) => {
    console.log('SOCKET.OI: se conectó un usuario');
    socket.on('newProduct', (producto) => {
        console.log("nuevo producto via socket.io: ", producto);
        io.emit('newProduct', producto);
    });
    socket.on("email", (newChat) => {
        console.log('chat iniciado');
        console.log(newChat);
        user = newChat;
    });
    socket.on("chat", (newChatMsg) => {
        console.log(newChatMsg);
        const timestamp = dayjs_1.default();
        obj = {
            id: faker.datatype.uuid(),
            author: {
                id: faker.datatype.uuid(),
                user: user,
                timestamp: timestamp,
                age: Math.floor(Math.random() * (100 - 12 + 1)) + 12,
                alias: faker.hacker.noun(),
                avatar: faker.image.avatar()
            }, text: {
                id: faker.datatype.uuid(),
                text: newChatMsg
            }
        };
        console.log('obj in server: ', obj);
        const normalizedObj = normalizr_1.normalize(obj, mensaje);
        //ESTO ESTA MAL, ESTOY DUPLICANDO EL OBJETO Y LLAMANDO A FAKER OTRA VEZ
        objWithNormedMsg = Object.assign(Object.assign({}, obj), { normalizedObj: normalizedObj });
        io.emit("chat", objWithNormedMsg);
        const stringified = JSON.stringify(obj);
        fs_1.default.appendFileSync('./chatLog.txt', '\n' + stringified);
    });
});
app.use(express_1.default.static('public'));
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/api', require('./rutas/routing'));
app.use('/productos', require('./rutas/routing'));
// RUTAS:
app.get('/', (req, res) => {
    console.log("location: /");
    if (req.isAuthenticated()) {
        console.log('req.session', req.session);
        console.log('req.user', req.user);
        res.redirect('/dashboard');
    }
    else {
        res.redirect('/ingreso');
    }
});

//LOGGER:
// configuracion del logger
const loggerConfig = {
    'transports': [
        new winston.transports.Console({
            level: 'silly'
        }), 
        new winston.transports.File({
            level: 'warn',
            filename: "./logs/warn.log"
        }),
         new winston.transports.File({
            level: 'error',
            filename: "./logs/error.log"
        })
    ]
}

// creo una instancia de winston
const logger = winston.createLogger(loggerConfig)

logger.info('winston test')
logger.warn("this is a warning")

//RUTAS
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public/dashboard.html'));
});
//INGRESO:
app.get("/ingreso", (req, res) => {
    logger.info('req.session: ', req.session);
    res.sendFile(path.join(__dirname, '..', 'public/ingreso.html'));
});
app.post('/ingreso', passport.authenticate('login', { failureRedirect: '/failedlogin' }), (req, res) => {
    res.redirect('/');
});
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/failedlogin' }), (req, res) => {
    res.redirect('/');
});
app.get('/auth/facebook', passport.authenticate('facebook'));
// REGISTRO:
app.get("/registro", (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public/registro.html'));
});
app.post('/registro', passport.authenticate('register', { failureRedirect: '/failedregister' }), (req, res) => {
    res.redirect('/');
});
//LOGOUT:
app.get('/logout', (req, res) => {
    req.logOut();
    res.redirect("/");
});
// ERRORES
app.get('/failedregister', (req, res) => {
    res.send("FALLÓ EL REGISTRO");
});
app.get('/failedlogin', (req, res) => {
    res.send("FALLÓ EL LOGIN");
});
// SYSTEM INFO
app.get('/info', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public/info.html'));
});
app.get('/getInfo', (req, res) => {
    res.send({
        "cwd": process.cwd(),
        "os": process.platform,
        "node-version": process.version,
        "memory-usage": JSON.stringify(process.memoryUsage()),
        "process-id": process.pid,
        "cores" : numCPUs, 
    });
});

app.get('/randoms', (req, res) => {
  let cant = req.query.cant || 500000000

    const computo = fork(path.join(__dirname, 'randoms.js'))
    computo.send(cant)

    computo.on("message", msg => {
        logger.info('main-process: ', msg)
        res.json(msg)
    })
})

let port = process.argv[2] || 3000;
let mode = process.argv[3] || "fork";

http.listen(port, () => {
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        logger.info("conectado a mongoAtlas");
    });
    //conexion a mongoose
    mongoose.connect('mongodb+srv://emma:borinda@cluster0.ydcxa.mongodb.net/users?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
    logger.info('server is live on port', port);
    logger.info('CPUs: ', numCPUs)
});
// esto va a pasar cuando por alguna razón se corte el proceso:
process.on('exit', (code) => {
    logger.error('exiting with code: ', code);
});



