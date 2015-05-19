/**
 * Module dependencies
 */
var bcrypt         = require('bcryptjs');
var bodyParser     = require('body-parser');
var errorHandler   = require('errorhandler');
var express        = require('express');
var http           = require('http');
var jwt            = require('jwt-simple');
var methodOverride = require('method-override');
var moment         = require('moment');
var mongoose       = require('mongoose');
var morgan         = require('morgan');
var path           = require('path');
var request        = require('request');

/**
 * Application prototype
 */
var app = express();
var config = require('./config');

/**
 * Application config
 */
app.set('port', process.env.PORT || 3000);

/**
 * Middleware config
 */
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride());

/**
 * Define the public folder
 */
var publicFolder = path.join(__dirname, '../browser');
app.use(express.static(publicFolder));

/**
 * Environment config
 */
var env = process.env.NODE_ENV || 'development';

if(env === 'development') {
  app.use(errorHandler());
}


/**
 * Database
 */
var UserSchema = new mongoose.Schema({
  instagramId: {
    type: String,
    index: true
  },

  googleId: {
    type: String,
    index: true
  },

  email: {
    type: String,
    unique: true,
    lowercase: true
  },

  password: {
    type: String,
    select: false
  },

  username: {
    type: String
  },

  fullName: {
    type: String
  },

  picture: {
    type: String
  },

  accessToken: {
    type: String
  }
});

var User = mongoose.model('User', UserSchema);

mongoose.connect(config.db);

/**
 * JWT
 */

function debug(str) {
  console.log('\n\n/* ============================================= */\n');
  console.log(str);
  console.log('\n/* ============================================= */\n\n');
}

function createToken(user) {
  var payload = {
    exp: moment().add(14, 'days').unix(),
    iat: moment().unix(),
    sub: user._id
  };

  return jwt.encode(payload, config.tokenSecret);
}

function isAuthenticated(req, res, next) {
  if(!(req.headers && req.headers.authorization)) {
    return res.status(400).send({message: 'You did not provide a JWT in the Authorization header.'});
  }

  var header = req.headers.authorization.split(' ');
  var token = header[1];
  var payload = jwt.decode(token, config.tokenSecret);
  var now = moment().unix();

  if(now > payload.exp) {
    return res.status(401).send({message: 'JWT has expired.'});
  }

  User.findById(payload.sub, function(err, user) {
    if(!user) {
      return res.status(400).send({message: 'User no longer exists.'});
    }

    req.user = user;
    next();
  });
}

/**
 * Routes config
 */

app.post('/auth/login', function(req, res) {
  var query = { email: req.body.email };

  // Here we define '+password' to retrieve the password fieldbecause this
  // property was set as "select: false" on the database Schema.
  User.findOne(query, '+password', function(err, user) {
    if(!user) {
      return res.status(401).send({ message: {email: 'Incorrect email.'} });
    }

    bcrypt.compare(req.body.password, user.password, function(err, isMatch) {
      if(!isMatch) {
        return res.status(401).send({ message: {password: 'Incorrect password.'} });
      }

      user = user.toObject();
      delete user.password;

      var token = createToken(user);
      res.send({token: token, user: user});
    })
  });
});

app.post('/auth/signup', function(req, res) {
  var query = { email: req.body.email };

  User.findOne(query, function(err, existingUser) {
    if(existingUser) {
      return res.status(409).send({ message: 'Email is already taken. '});
    }

    var user = new User({
      email: req.body.email,
      password: req.body.password
    });

    bcrypt.genSalt(10, function(err, salt) {
      bcrypt.hash(user.password, salt, function(err, hash) {
        user.password = hash;

        user.save(function() {
          var token = createToken(user);
          res.send({ token: token, user: user });
        })
      });
    });
  });
});

app.post('/auth/instagram', function(req, res) {
  var accessTokenUrl = 'https://api.instagram.com/oauth/access_token';

  var params = {
    client_id: req.body.clientId,
    redirect_uri: req.body.redirectUri,
    client_secret: config.clientSecret,
    code: req.body.code,
    grant_type: 'authorization_code'
  };

  // Step 1: Exchange authorization code for access token.
  request.post({ url: accessTokenUrl, form: params, json: true}, function(error, response, body) {
    // Step 2a: Link user accounts.
    if(req.headers.authorization) {

      var query = {
        instagramId: body.user.id
      };

      User.findOne(query, function(err, existingUser) {
        var token = req.headers.authorization.split(' ')[1];
        var payload = jwt.decode(token, config.tokenSecret);

        User.findOne(payload.sub, '+password', function(err, localUser) {
          if(!localUser) {
            return res.status(400).send({ message: 'User not found. '});
          }

          // Merge two accounts
          if(existingUser) {
            existingUser.email = localUser.email;
            existingUser.password = localUser.password;

            existingUser.save(function() {
              var token = createToken(existingUser);
              return res.send({ token: token, user: existingUser });
            });
          } else {
            // Link current email account with the instagram profile information
            localUser.instagramId = body.user.id;
            localUser.username = body.user.username;
            localUser.fullName = body.user.full_name;
            localUser.picture = body.user.profile_picture;
            localUser.accessToken = body.access_token;

            localUser.save(function() {
              var token = createToken(localUser);
              return res.send({ token: token, user: localUser });
            });
          }
        });
      });

    // Step 2b: Create a new user account or return an existing one.
    } else {
      var query = {
        instagramId: body.user.id
      };

      User.findOne(query, function(err, existingUser) {
        if(existingUser) {
          var token = createToken(existingUser);
          return res.send({ token: token, user: existingUser});
        }

        var user = new User({
          instagramId: body.user.id,
          username: body.user.username,
          fullName: body.user.full_name,
          picture: body.user.profile_picture,
          accessToken: body.access_token
        });

        user.save(function() {
          var token = createToken(user);
          res.send({ token: token, user: user});
        });
      });
    }
  });
});

/*
 |--------------------------------------------------------------------------
 | Login with Google
 |--------------------------------------------------------------------------
 */
app.post('/auth/google', function(req, res) {
  var accessTokenUrl = 'https://accounts.google.com/o/oauth2/token';
  var peopleApiUrl = 'https://www.googleapis.com/plus/v1/people/me/openIdConnect';
  var params = {
    code: req.body.code,
    client_id: req.body.clientId,
    client_secret: config.GOOGLE_SECRET,
    redirect_uri: req.body.redirectUri,
    grant_type: 'authorization_code'
  };

  // Step 1. Exchange authorization code for access token.
  request.post(accessTokenUrl, { json: true, form: params }, function(err, response, token) {
    var accessToken = token.access_token;
    var headers = { Authorization: 'Bearer ' + accessToken };

    // Step 2. Retrieve profile information about the current user.
    request.get({ url: peopleApiUrl, headers: headers, json: true }, function(err, response, profile) {

      // Step 3a. Link user accounts.
      if (req.headers.authorization) {
        User.findOne({ google: profile.sub }, function(err, existingUser) {
          if (existingUser) {
            return res.status(409).send({ message: 'There is already a Google account that belongs to you' });
          }
          var token = req.headers.authorization.split(' ')[1];
          var payload = jwt.decode(token, config.TOKEN_SECRET);
          User.findById(payload.sub, function(err, user) {
            if (!user) {
              return res.status(400).send({ message: 'User not found' });
            }
            user.google = profile.sub;
            user.picture = user.picture || profile.picture.replace('sz=50', 'sz=200');
            user.displayName = user.displayName || profile.name;
            user.save(function() {
              var token = createToken(user);
              res.send({ token: token, user: user });
            });
          });
        });
      } else {
        // Step 3b. Create a new user account or return an existing one.
        User.findOne({ google: profile.sub }, function(err, existingUser) {
          if (existingUser) {
            return res.send({ token: createToken(existingUser) });
          }
          var user = new User();
          user.google = profile.sub;
          user.picture = profile.picture.replace('sz=50', 'sz=200');
          user.displayName = profile.name;
          user.save(function(err) {
            var token = createToken(user);
            res.send({ token: token, user: profile });
          });
        });
      }
    });
  });
});


app.get('/users', function(req, res) {
  User.find({}, function(err, users) {
    // res.json(users[0].remove());
    res.json(users);
  });
});


app.get('/protected', isAuthenticated, function(req, res) {
  res.json(req.user);
});

app.get('/api/feed', isAuthenticated, function(req, res) {
  var feedUrl = 'https://api.instagram.com/v1/users/self/feed';
  var params = { access_token: req.user.accessToken };

  request.get({ url: feedUrl, qs: params, json: true}, function(error, response, body) {
    if(!error && response.statusCode == 200) {
      res.send(body.data);
    }
  });
})

app.get('/api/media/:id', isAuthenticated, function(req, res) {
  var mediaUrl = 'https://api.instagram.com/v1/media/' + req.params.id;
  var params = { access_token: req.user.accessToken };

  request.get({ url: mediaUrl, qs: params, json: true}, function(error, response, body) {
    if(!error && response.status == 200) {
      res.send(body.data);
    }
  });
});

app.post('/api/like', isAuthenticated, function(req, res) {
  var mediaId = req.body.mediaId;
  var accessToken = { access_token: req.user.accessToken };
  var likeUrl = 'https://api.instagram.com/v1/media' + mediaId + '/likes';

  request.post({ url: likeUrl, form: accessToken, json: true}, function(error, response, body) {
    if(response.statusCode !== 200) {
      return res.status(response.statusCode.send({
        code: response.statusCode,
        message: body.meta.error_message
      }));

      res.status(200).end();
    }
  })
});

app.get('*', function(req, res) {
  res.sendFile(path.join(publicFolder, 'index.html'));
});

/**
 * Start the server
 */
app.listen(app.get('port'));
