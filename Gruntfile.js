'use strict';

module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        // Metadata.
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            options: {
                banner: '<%= banner %>'
            },
            dist: {
                src: 'src/he.js',
                dest: 'dist/he.min.js'
            },
        },
        'serve': {
            'path': 'example/'
        },
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-serve');

    // Default task.
    grunt.registerTask('default', ['uglify', 'serve']);

};
