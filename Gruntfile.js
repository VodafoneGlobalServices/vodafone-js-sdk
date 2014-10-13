'use strict';

var PROD = {
    options: {
        compress: {
            global_defs: {
                DEBUG: false,
                DEV: false,
                PRE_PROD: false,
                PROD: true
            },
            dead_code: true,
            drop_console: true
        }
    },
    src: 'src/he.js',
    dest: 'dist/vodafone.min.js'
};
var PROD_DEBUG = {
    options: {
        beautify: true,
        mangle: false,
        compress: {
            global_defs: {
                DEBUG: true,
                DEV: false,
                PRE_PROD: false,
                PROD: true
            },
            dead_code: true,
            drop_console: false
        }
    },
    src: 'src/he.js',
    dest: 'dist/vodafone.debug.js'
};
var DEV = {
    options: {
        beautify: true,
        mangle: false,
        compress: {
            global_defs: {
                DEBUG: true,
                DEV: true,
                PRE_PROD: false,
                PROD: false
            },
            dead_code: true,
            drop_console: false
        }
    },
    src: 'src/he.js',
    dest: 'dist/vodafone.dev.js'
};

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
                dest: 'example/static/',
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
    grunt.registerTask('default', ['jshint', 'clean', 'plato', 'uglify:dev', 'uglify:prod_debug', 'uglify:prod', 'copy']);
    grunt.registerTask('serve', ['uglify', 'serve']);
};
