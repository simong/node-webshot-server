var fs = require('fs');

var Url = require('url');
var WebshotAPI = require('../api');

/*!
 * Generate and store image
 */
exports.store = function(req, res) {
    var name = req.param('name');
    if (!name) {
        return res.send(400, 'Missing name');
    }

    var url = req.param('url');
    if (!url) {
        return res.send(400, 'Missing url');
    }

    var parsedUrl = Url.parse(url);
    if (!parsedUrl.protocol) {
        return res.send(400, 'Invalid url, missing protocol');
    }
    if (!parsedUrl.hostname) {
        return res.send(400, 'Invalid url, missing hostname');
    }

    var options = {
        'width': req.param('width'),
        'height': req.param('height'),
        'delay': req.param('delay'),
        'userAgent': req.param('userAgent'),
        'full': (req.param('full') === 'true')
    };
    WebshotAPI.store(name, url, options, function(err) {
        if (err) {
            return res.send(err.code, err.msg);
        }

        return res.send(200, {'url': '/f/' + name});
    });
};

/*!
 * Redirect the user to a stored image
 */
exports.getStoredImage = function(req, res) {
    WebshotAPI.getStoredImageUrl(req.param('name'), function(err, url) {
        if (err) {
            return res.send(err.code, err.message);
        }

        // Redirect the user to the S3 URL
        return res.redirect(url);
    });
};

/*!
 * Generate an image
 */
exports.generate = function(req, res) {
    var url = req.param('url');
    if (!url) {
        return res.send(400, 'Missing url');
    }

    var parsedUrl = Url.parse(url);
    if (!parsedUrl.protocol) {
        return res.send(400, 'Invalid url, missing protocol');
    }
    if (!parsedUrl.hostname) {
        return res.send(400, 'Invalid url, missing hostname');
    }

    var options = {
        'width': req.param('width'),
        'height': req.param('height'),
        'delay': req.param('delay'),
        'userAgent': req.param('userAgent'),
        'full': (req.param('full') === 'true')
    };

    WebshotAPI.generate(url, options, function(err, path) {
        if (err) {
            res.send(err.code, err.msg);
        } else {
            // Construct a prettier name for our image
            // For example, `http://okfn.org/about/how-we-can-help-you/` will result in `okfn_org_about_how_we_can_help_you.png`
            var imageName = parsedUrl.hostname.replace(/\W/g, '_');
            var pathName = parsedUrl.pathname.replace(/\W/g, '_').replace(/_$/, '');
            if (pathName) {
                imageName += pathName;
            }
            imageName += '.png';
            res.download(path, imageName, function() {
                fs.unlink(path);
            });
        }
    });
};
