'use strict';

var ENVIRONMENT = {
    PROD: 'PROD',
    PRE_PROD: 'PRE-PROD',
    DEV: 'DEV',
    ASLAU: 'ASLAU'
}

//Base config for PROD
var PROD = {
    src: 'src/he.js',
    dest: 'dist/vodafone.min.js',
    options: {
        beautify: false,
        mangle: true,
        compress: {
            global_defs: {
                DIRECT: false,
                ENV: ENVIRONMENT.PROD
            },
            dead_code: true,
            drop_console: true
        }
    }
};

var PROD_DEBUG = Object.create(PROD);
PROD_DEBUG.dest = "dist/vodafone.debug.js";
PROD_DEBUG.options.beautify = true;
PROD_DEBUG.options.mangle = false;
PROD_DEBUG.options.compress.drop_console = false;


//Base config for PRE PROD
var PRE_PROD = Object.create(PROD);
PRE_PROD.dest = "dist/vodafone.pre.js";
PRE_PROD.options.compress.global_defs.ENV = ENVIRONMENT.PRE_PROD;

var PRE_PROD_DEBUG = Object.create(PRE_PROD);
PRE_PROD_DEBUG.dest = "dist/vodafone.pre.debug.js";
PRE_PROD_DEBUG.options.beautify = true;
PRE_PROD_DEBUG.options.mangle = false;
PRE_PROD_DEBUG.options.compress.drop_console = false;


//Development settings
var DEV = Object.create(PROD);
DEV.dest = "dist/vodafone.dev.js";
DEV.options.beautify = true;
DEV.options.mangle = false;
DEV.options.compress.global_defs.DIRECT = true;
DEV.options.compress.global_defs.ENV = ENVIRONMENT.ASLAU;
DEV.options.compress.drop_console = false;

module.exports = function (grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        clean: ['dist/*.js', 'test/testem.tap'],

        bump: {
            options: {
                files: ['package.json'],
                commit: false,
                commitMessage: 'Release v%VERSION%',
                commitFiles: ['package.json'],
                createTag: false,
                tagName: 'v%VERSION%',
                tagMessage: 'Version %VERSION%',
                push: false,
                pushTo: 'upstream',
                gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
                globalReplace: false
            }
        },

        jshint: {
            all: ['src/*.js'],
            options: grunt.file.readJSON('.jshintrc')
        },
        uglify: {
            prod: PROD,
            prod_debug: PROD_DEBUG,
            pre_prod: PRE_PROD,
            pre_prod_debug: PRE_PROD_DEBUG,
            dev: DEV
        },
        'serve': {
            'path': 'example/'
        },
        plato: {
            options: {
                title: 'SeamlessID',
                jshint: grunt.file.readJSON('.jshintrc')
            },
            metrics: {
                files: {
                    'dist/metrics': [ 'src/*.js' ]
                }
            }
        },
        copy: {
            main: {
                src: 'dist/*.js',
                dest: 'example/static/'
            }
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-bump');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-serve');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-testem');
    grunt.loadNpmTasks('grunt-qunit-cov');
    grunt.loadNpmTasks('grunt-plato');
    grunt.loadNpmTasks('grunt-contrib-copy');

    // Default task.
    grunt.registerTask('default', ['jshint', 'clean', 'plato', 'uglify:prod', 'uglify:prod_debug', 'uglify:pre_prod', 'uglify:pre_prod_debug', 'uglify:dev', 'copy']);
    grunt.registerTask('serve', ['uglify', 'serve']);
};
