var aws = require('aws-sdk');
var fs = require('fs');
var path = require('path');
var temp = require('temp');
var webshot = require('webshot');

// The S3 client that will be used to store images in S3. It gets its credentials
// from the environment variables
var s3 = new aws.S3({
    'accessKeyId': process.env.AWS_ACCESS_KEY_ID,
    'secretAccessKey': process.env.AWS_SECRET_ACCESS_KEY,
    'region': process.env.AWS_REGION
});

/**
 * Store an image for a URL. Once generated and stored, the image will be available at /f/<name>
 *
 * @param  {String}     name                The name of the image under which the URL should be made available
 * @param  {String}     url                 The URL for which to generate a PNG image
 * @param  {Object}     [options]           A set of options that manipulate the image
 * @param  {Number}     [options.width]     The desired width (in pixels) for the generated image, default: 1024
 * @param  {Number}     [options.height]    The desired height (in pixels) for the generated image, default 768
 * @param  {Number}     [options.delay]     The delay (in milliseconds) before the screenshot, default 0, maximum 10000
 * @param  {String}     [options.userAgent] An optional user agent, defaults to an empty string
 * @param  {Boolean}    [options.full]      If specified, the entire webpage will be screenshotted and the `options.height` property will be ignored
 * @param  {Function}   callback            A standard callback function
 * @param  {Object}     callback.err        An error object (if any)
 */
var store = module.exports.store = function(name, url, options, callback) {
    // Check whether we can use the proposed name
    checkFileExists(name, function(err, exists) {
        if (err) {
            return callback(err);
        } else if (exists) {
            return callback({'code': 400, 'msg': 'A URL by that name already exists'});
        }

        // Generate an image
        generate(url, options, function(err, imagePath) {
            if (err) {
                return callback(err);
            }

            // Upload the file to S3
            s3.upload({
                'Body': fs.createReadStream(imagePath),
                'Bucket': process.env.AWS_S3_BUCKET,
                'CacheControl': 'max-age=315360000',
                'ContentType': 'image/jpeg',
                'Expires': new Date(2035, 1, 1),
                'Key': getS3Key(name),
            }, function(uploadError) {

                // Delete the image on disk
                fs.unlink(imagePath, function(unlinkError) {
                    if (uploadError) {
                        return callback({'code': 500, 'message': 'Unable to upload the rendered image of the website to S3'});
                    }

                    // Otherwise we're done here
                    return callback();
                });
            });
        });
    });
};

/**
 * Get the URL for a stored image
 *
 * @param  {String}     name                The name of the image under which the URL was made available when storing
 * @param  {Function}   callback            Standard callback function
 * @param  {Object}     callback.err        An error object (if any)
 * @param  {String}     callback.url        The URL where the stored image can be downloaded
 */
var getStoredImageUrl = module.exports.getStoredImageUrl = function(name, callback) {
    checkFileExists(name, function(err, exists) {
        if (err) {
            return callback(err);
        } else if (!exists) {
            return callback({'code': 404, 'msg': 'A URL by that name does not exist'});
        }

        // Redirect the user to the S3 file
        var params = {
            'Bucket': process.env.AWS_S3_BUCKET,
            'Key': getS3Key(name)
        };
        var url = s3.getSignedUrl('getObject', params);
        return callback(null, url);
    });
};

/**
 * Check if a file exists in S3
 *
 * @param  {String}     name                The name of the image under which the URL should be made available
 * @param  {Function}   callback            Standard callback function
 * @param  {Object}     callback.err        An error object (if any)
 * @param  {Boolean}    callback.exists     Whether the file exists or not
 * @api private
 */
var checkFileExists = function(name, callback) {
    s3.getObject({
        'Bucket': process.env.AWS_S3_BUCKET,
        'Key': getS3Key(name)
    }, function(err, data) {
        if (err && err.code !== 'NoSuchKey') {
            return callback({'code': 500, 'message': err.message});
        } else if (err && err.code === 'NoSuchKey') {
            return callback(null, false);
        } else {
            return callback(null, true);
        }
    });
};

/**
 * Given a name, get the corresponding S3 key
 *
 * @param  {String}     name    The name of the file
 * @return {String}             The key for the file in S3
 * @api private
 */
var getS3Key = function(name) {
    return path.join(process.env.AWS_S3_DIRECTORY, name)
};

/**
 * Generates a PNG image for a URL
 *
 * @param  {String}     url                 The URL for which to generate a PNG image
 * @param  {Object}     [options]           A set of options that manipulate the image
 * @param  {Number}     [options.width]     The desired width (in pixels) for the generated image, default: 1024
 * @param  {Number}     [options.height]    The desired height (in pixels) for the generated image, default 768
 * @param  {Number}     [options.delay]     The delay (in milliseconds) before the screenshot, default 0, maximum 10000
 * @param  {String}     [options.userAgent] An optional user agent, defaults to an empty string
 * @param  {Boolean}    [options.full]      If specified, the entire webpage will be screenshotted and the `options.height` property will be ignored
 * @param  {Function}   callback            A standard callback function
 * @param  {Object}     callback.err        An error object (if any)
 * @param  {String}     callback.path       The path on disk where the image is stored
 */
var generate = module.exports.generate = function(url, options, callback) {
    options = options || {};
    options.width = options.width || 1024;
    options.height = options.height || 768;
    options.delay = options.delay || 0;
    options.userAgent = options.userAgent || '';

    if (options.delay > 10000) {
        options.delay = 10000;
    }

    screengrab(url, options, callback);
};

/**
 * Take a screenshot of url
 *
 * @param  {String}     url             The URL for which to generate a PNG image
 * @param  {Object}     options         A set of options that manipulate the page
 * @param  {Function}   callback        A standard callback function
 * @param  {Object}     callback.err    An error object (if any)
 * @param  {String}     callback.path   The path on disk where the image is stored
 * @api private
 */
var screengrab = function(url, options, callback) {
    var tempPath = temp.path({suffix: '.png'});

    var webshotOptions = {
        'renderDelay': options.delay,
        'windowSize': {
            'width': options.width,
            'height': options.height
        },
        'shotSize': {
            'width': 'window',
            'height': (options.full === true) ? 'all' : 'window'
        },
        'userAgent': options.userAgent,
        'phantomConfig': {
            'ignore-ssl-errors': true,
            'ssl-protocol': 'any'
        }
    };

    webshot(url, tempPath, webshotOptions, function(err) {
        if (err) {
            return callback({'code': 500, 'msg': 'Unable to take a screenshot'});
        }

        return callback(null, tempPath);
    });
};
