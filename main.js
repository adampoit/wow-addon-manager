var fs = require('fs');
var path = require('path');
var cheerio = require('cheerio');
var request = require('request');
var admzip = require('adm-zip');
var async = require('async');
var _ = require('underscore');
var addons = require('./addons').addons;

var wowPath = 'E:\\World of Warcraft\\interface\\addons';

var downloadAndUnzip = function(url, dest, callback) {
  var zipFile = dest + '.zip';

  request(url)
    .pipe(fs.createWriteStream(zipFile))
    .on('close', function() {
      var zip = new admzip(zipFile);
      zip.extractAllTo(dest, true);

      fs.readdir(dest, function(err, files) {
        var addonToc = path.join(files[0], files[0] + '.toc');
        callback(addonToc);
      });
    });
}

var checkAddon = function(addonLink, callback) {
  request(addonLink + '/download', function(error, response, html) {
    var $ = cheerio.load(html);
    var downloadPath = $('a.download-link').attr('data-href');
    var addonName = $('h2.caption span.right').html();
    var addonPath = path.join('temp', path.basename(downloadPath, '.zip'));

    downloadAndUnzip(downloadPath, addonPath, function(addonToc) {
      fs.readFile(path.join(addonPath, addonToc), function(err, content) {
        var versionRegex = ' Version: ([a-z0-9\.]+)';

        var curseVersionMatch = content.toString().match(versionRegex);
        if (curseVersionMatch == null)
        {
          versionRegex = ' X-Curse-Packaged-Version: ([a-z0-9\.]+)';
        }

        var curseVersion = content.toString().match(versionRegex)[1];

        fs.readFile(path.join(wowPath, addonToc), function(err, content) {
          var localVersion = content.toString().match(versionRegex)[1];

          if (localVersion === curseVersion)
            callback(null, null);
          else
            callback(null, addonName);
        });
      });
    });
  });
}

console.log('Checking for updates...');

async.map(addons, checkAddon, function(err, results) {
  var addonsToUpdate = _.filter(results, function(name) { return name != null; });

  if (addonsToUpdate.length == 0)
    console.log('No addons need updating');
  else
    _.each(addonsToUpdate, function(name) { console.log(name + ' needs an update'); });
});
