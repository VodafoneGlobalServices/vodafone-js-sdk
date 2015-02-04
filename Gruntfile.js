'use strict';

var ENVIRONMENT = {
    PROD: 'PROD',
    PRE_PROD: 'PRE_PROD',
    DEV: 'DEV',
    ASLAU: 'ASLAU'
}

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

var PROD_DEBUG = {
    src: 'src/he.js',
    dest: 'dist/vodafone.debug.js',
    options: {
        beautify: true,
        mangle: false,
        compress: {
            global_defs: {
                DIRECT: false,
                ENV: ENVIRONMENT.PROD
            },
            dead_code: true,
            drop_console: false
        }
    }
};

var PRE_PROD = {
    src: 'src/he.js',
    dest: 'dist/vodafone.pre.js',
    options: {
        beautify: false,
        mangle: true,
        compress: {
            global_defs: {
                DIRECT: false,
                ENV: ENVIRONMENT.PRE_PROD
            },
            dead_code: true,
            drop_console: true
        }
    }
};

var PRE_PROD_DEBUG = {
    src: 'src/he.js',
    dest: 'dist/vodafone.pre.debug.js',
    options: {
        beautify: true,
        mangle: false,
        compress: {
            global_defs: {
                DIRECT: false,
                ENV: ENVIRONMENT.PRE_PROD
            },
            dead_code: true,
            drop_console: false
        }
    }
};

var DEV = {
    src: 'src/he.js',
    dest: 'dist/vodafone.dev.js',
    options: {
        beautify: true,
        mangle: false,
        compress: {
            global_defs: {
                DIRECT: true,
                ENV: ENVIRONMENT.ASLAU
            },
            dead_code: true,
            drop_console: false
        }
    }
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
