require('dotenv').load();

/*
 * requires
 */

var gravatar = require('gravatar');
var request = require('superagent');
var path = require('path');
var env = process.env;
var app = require('express')();
var f = require('util').format;

/*
 * middleware
 */

app.use(require('morgan')('dev'));
app.use(require('body-parser').json());
app.use(require('body-parser').urlencoded({ extended: false }));
app.use(require('express').static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// home
app.get('/', function (req, res) {
  res.render('index', { welcome: env.WELCOME_MESSAGE });
});

// post
app.post('/invite', function (req, res) {
  var person = {
    first: req.body.first,
    last:  req.body.last,
    email: req.body.email
  };

  res.locals.person = person;
  res.locals.success = false;

  sendInvite(person, function (err, _) {
    if (err) {
      console.warn(err);
      res.locals.success = false;
      res.locals.error = err;
    } else {
      res.locals.success = true;
    }

    res.render('invite');
  });
});

/*
 * listen
 */

var server = app.listen(process.env.PORT || 3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('✓ http://%s:%s', host, port);
});

/**
 * send an invite
 * See: https://api.slack.com/docs/attachments
 * See: https://api.slack.com/docs/formatting
 * See: https://my.slack.com/services/new/incoming-webhook
 *
 *     sendInvite({ first: "Rico", last: "SC", email: "r@s" });
 */

function sendInvite (person, fn) {
  function empty (str) {
    return str.toString().trim().length === 0;
  }

  if (empty(person.first) ||
      empty(person.last) ||
      empty(person.email))
    return fn(new Error("Invalid: fill in all fields"));

  if (!person.email.match(/^.+@.+$/))
    return fn(new Error("Invalid: email sucks"));

  var url = f("https://%s.slack.com/admin/invites/full", env.SLACK_TEAM);

  var fallback = f("%s %s (%s) requested an invite",
    person.first, person.last, person.email);

  var text = f("*%s %s* requested an invite - <%s|Send ›>",
    person.first, person.last, url);

  var icon = gravatar.url(person.email, {s: '96'}, true);

  var payload = {
    text: text,
    username: env.BOT_NAME,
    channel: env.BOT_CHANNEL,
    // icon_emoji: env.BOT_EMOJI,
    icon_url: icon,
    attachments: [{
      fallback: fallback,
      color: 'good',
      fields: [
        { title: '',
          value: f("%s %s <%s>", person.first, person.last, person.email.replace(/\+/g, '%2B')),
          short: false }
      ]
    }]
  };

  request
    .post(env.WEBHOOK_URL)
    .send('payload=' + JSON.stringify(payload))
    .end(fn);
}
