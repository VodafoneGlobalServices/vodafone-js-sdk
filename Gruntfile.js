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
            options: {
                banner: '<%= banner %>'
            },
            dist: {
                src: 'src/he.js',
                dest: 'dist/he.min.js'
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
    grunt.registerTask('default', ['uglify', 'serve']);
    grunt.registerTask('jenkins', ['jshint', 'clean', 'plato', 'uglify']);
//    grunt.registerTask('jenkins', ['jshint', 'testem', 'clean', 'qunit-cov', 'plato', 'concat', 'uglify']);
};
