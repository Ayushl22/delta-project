// ======================
// ENV Configuration
// ======================

if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
  console.log(process.env.SECRET);
}

// ======================
// Required Packages
// ======================

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
let MongoStore = null;
try {
  const connectMongo = require("connect-mongo");
  MongoStore = connectMongo.MongoStore || connectMongo.default;
} catch (e) {
  MongoStore = null;
}
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");

// ======================
// Routes
// ======================

const listings = require("./routes/listing");
const review = require("./routes/review");
const user = require("./routes/user");

// ======================
// Utilities
// ======================

const ExpressError = require("./utils/expressError");

// ======================
// Models
// ======================

const User = require("./models/user");

// ======================
// App Initialization
// ======================

const app = express();

// ======================
// MongoDB Connection
// ======================

const dbUrl = process.env.ATLASDB_URL || process.env.MONGODB_URI || process.env.MONGO_URI;

if (!dbUrl) {
  console.error("❌ MongoDB URL not found! Add ATLASDB_URL (or MONGODB_URI) to your .env file.");
  console.error("   Example: ATLASDB_URL=mongodb://localhost:27017/airbnb");
  process.exit(1);
}

main()
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dbUrl);
}

// ======================
// View Engine Setup
// ======================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

// ======================
// Middleware
// ======================

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// ======================
// Mongo Session Store
// ======================

let store = null;
if (MongoStore && dbUrl) {
  store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
      secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
  });
  store.on("error", function (err) {
    console.log("SESSION STORE ERROR", err);
  });
}

// ======================
// Session Configuration
// ======================

const sessionOptions = {
  ...(store && { store }),
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,

  cookie: {
    expires: Date.now() + 1000 * 60 * 60 * 24 * 3,
    maxAge: 1000 * 60 * 60 * 24 * 3,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());

// ======================
// Passport Authentication
// ======================

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ======================
// Demo User Route
// ======================

app.get("/demouser", async (req, res) => {
  let fakeUser = new User({
    email: "student@gmail.com",
    username: "student",
  });

  const registeredUser = await User.register(fakeUser, "helloworld");

  res.send(registeredUser);
});

// ======================
// Flash + Current User Middleware
// ======================

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

// ======================
// Routes
// ======================

app.use("/listings", listings);
app.use("/listings/:id/reviews", review);
app.use("/", user);

// ======================
// Root Route - redirect to listings
// ======================

app.get("/", (req, res) => {
  res.redirect("/listings");
});

// ======================
// 404 Handler
// ======================

app.use((req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

// ======================
// Error Handler
// ======================

app.use((err, req, res, next) => {
  let { status = 500, message = "Something Went Wrong" } = err;
  res.status(status).render("error.ejs", { message });
});

// ======================
// Server Start
// ======================

app.listen(8080, () => {
  console.log("🚀 Server running on port 8080");
});