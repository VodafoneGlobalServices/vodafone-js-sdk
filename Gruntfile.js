'use strict';

module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        clean: ['dist/*.js', 'test/testem.tap'],
        jshint: {
            all: ['src/*.js'],
            options: grunt.file.readJSON('.jshintrc')
        },
        uglify: {
            prod: {
                options: {
                    compress: {
                        global_defs: {
                            DEBUG: false,
                            DEV: false,
                            PRE_PROD: false,
                            PROD: true
                        },
                        dead_code: true
                    }
                },
                src: 'src/he.js',
                dest: 'dist/vodafone.min.js'
            },
            prod_debug: {
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
                        dead_code: true
                    }
                },
                src: 'src/he.js',
                dest: 'dist/vodafone.debug.js'
            },
            dev: {
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
                        dead_code: true
                    }
                },
                src: 'src/he.js',
                dest: 'dist/vodafone.dev.js'
            }
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
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-serve');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-testem');
    grunt.loadNpmTasks('grunt-qunit-cov');
    grunt.loadNpmTasks('grunt-plato');

    // Default task.
    grunt.registerTask('default', ['jshint', 'clean', 'plato', 'uglify:dev', 'uglify:prod_debug', 'uglify:prod']);
    grunt.registerTask('serve', ['uglify', 'serve']);
};
