module.exports = function(grunt) {

  // Project configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      options: {
        maxcomplexity: 45,
        expr: true,
        loopfunc: true,
        quotmark: 'single',
        node: true
      },
      files: [
        '*.js',
        'lib/*.js'
      ]
    },

    jscs: {
      options: {
        force: true,
        disallowTrailingWhitespace: true,
        requireSpaceAfterLineComment: true,
        disallowFunctionDeclarations: true,
        disallowMultipleVarDecl: true,
        disallowMixedSpacesAndTabs: true,
        disallowNewlineBeforeBlockStatements: true,
        disallowKeywordsOnNewLine: ['else'],
        validateIndentation: 2
      },
      files: { src: [
        '*.js',
        'lib/*.js'
      ]}
    }
  });

  // Load plugin(s)
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jscs');

  // Add task(s)
  grunt.registerTask('default', ['jscs', 'jshint']);
};

