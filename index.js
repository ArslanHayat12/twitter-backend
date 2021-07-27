var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var Strategy = require('passport-twitter').Strategy;
var session = require('express-session');
const dotenv = require("dotenv")
var Twit = require('twit')
// const hbjs = require('handbrake-js')
const fs = require("fs")
dotenv.config()
const authTokens={
    token:'', tokenSecret:''
}


passport.use(new Strategy({
    consumerKey: process.env.CONSUMER_KEY,
    consumerSecret: process.env.CONSUMER_SECRET,
    callbackURL: 'http://localhost:5000/twitter-callback'
}, function (token, tokenSecret, profile, callback) {
    authTokens.token=token
    authTokens.tokenSecret=tokenSecret

    return callback(null, profile);
}));

passport.serializeUser(function (user, callback) {
    callback(null, user);
})

passport.deserializeUser(function (obj, callback) {
    callback(null, obj);
})

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'whatever', resave: true, saveUninitialized: true }))

app.use(passport.initialize())
app.use(passport.session())

// 

app.get('/', function (req, res) {
    console.log(req.query,req.user)
    res.render('index', { user: req.user })
})

app.get('/twitter/login', passport.authenticate('twitter'))

app.get('/twitter-callback', passport.authenticate('twitter', {
    failureRedirect: '/'
}), function (req, res) {
    res.redirect('/')
})
app.get('/tweet',function(req,res){
    console.log(authTokens)
    var T = new Twit({
        consumer_key: process.env.CONSUMER_KEY, //get this from developer.twitter.com where your app info is
        consumer_secret: process.env.CONSUMER_SECRET, //get this from developer.twitter.com where your app info is
        access_token: authTokens.token,
        access_token_secret: authTokens.tokenSecret,
        timeout_ms: 60 * 1000,  // optional HTTP request timeout to apply to all requests.
        strictSSL: true,     // optional - requires SSL certificates to be valid.
    })
    
    const PATH = path.join(__dirname, `test.mp4`);

    T.postMediaChunked({ file_path: PATH }, function (err, data, response) {

        const mediaIdStr = data.media_id_string;
        const meta_params = { media_id: mediaIdStr };
        // you will need an object with your Twitter data
        const myTweetObj = {
            video_link: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
            content: 'This is the #text of the tweet',
            twitter_handle: 'user twitter handle here',
            access_token: 'twitter user token here',
            access_secret: 'twitter user secret here'
        };

        return new Promise(function (resolve, reject) {

            T.post('media/metadata/create', meta_params, function (err, data, response) {

                if (!err) {

                    const params = { status: myTweetObj.content, media_ids: [mediaIdStr] };

                    T.post('statuses/update', params, function (err, tweet, response) {

                        console.log(tweet);
                        const base = 'https://twitter.com/';
                        const handle = myTweetObj.twitter_handle;
                        const tweet_id = tweet.id_str;
                        resolve({
                            live_link: `${base}${handle}/status/${tweet_id}`
                        });

                    }); // end '/statuses/update'

                } // end if(!err)

            }); // end '/media/metadata/create'

        }); // end T.postMedisChunked
    });
})

app.listen(process.env.PORT || 5000);
module.exports = app;