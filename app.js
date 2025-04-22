const express = require('express');
const flash = require('connect-flash');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local');

const ejsMate = require('ejs-mate');
const ExpressError = require('./utils/ExpressError');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
const User = require('./models/user');
const Book = require('./models/book');

const { isLoggedIn } = require('./middleware');
const session = require('express-session');
const methodOverride = require('method-override'); 
const catchAsync = require('./utils/catchAsync');

const secret = 'thisshouldbeabettersecret!';
const dbUrl = 'mongodb://127.0.0.1:27017/ebook';
mongoose.connect(dbUrl, {
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
})


app.use(flash());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }))
app.use(methodOverride('_method'))
app.engine('ejs', ejsMate)
// AIzaSyCQrwWTvupb8mHolEo7z3_py5HDThFMenI
const sessionConfig = {
    secret: secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: Date.now() + 1000 * 60 * 60 * 24 * 7
    }
}

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})


app.get('/register', (req, res) => {
    res.render('register')
})
app.post('/register', catchAsync(async (req, res, next) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash('success', 'Welcome to Book Buddy');
            res.redirect('/books')
        })

    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/register')
    }
}))


app.get('/login', (req, res) => {
    res.render('login')
})
app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    req.flash('success', 'Welcome Back!');
    res.redirect('/books')
})

//logout
app.get('/logout', (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        req.flash('success', 'Goodbye!');
        res.redirect('/');
    });
});


//home page
app.get('/', (req, res) => {
    res.render('home')
})




app.get('/books', isLoggedIn, async (req, res) => {
    res.render('books')
})

app.get('/books/add', isLoggedIn, async (req, res) => {
    res.render('add')
})
app.post('/books/add', isLoggedIn, async (req, res) => {
    const book = new Book(req.body.book);
    await book.save();
    res.redirect('/books')
})

app.get('/books/show', isLoggedIn, async (req, res) => {
    const books = await Book.find({});
    res.render('show', { books })
})


app.get('/books/search', isLoggedIn, async (req, res) => {
    const { title } = req.query;
    const books = await Book.find({ title: new RegExp(title, 'i') });
    res.json(books);
});

app.get('/books/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const book = await Book.findById(id);
    res.render('showBook', { book })
})

app.delete('/books/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    await Book.findByIdAndDelete(id);
    req.flash('success', 'Book deleted successfully!');
    res.redirect('/books/show');
});



app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!'
    res.status(statusCode).render('error', { err });
})


const port = 3000;
app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})