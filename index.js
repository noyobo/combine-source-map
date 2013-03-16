'use strict';

var parse           =  require('parse-base64vlq-mappings');
var convert         =  require('convert-source-map');
var createGenerator =  require('inline-source-map');

function resolveMap(source) {
  var gen = convert.fromSource(source);
  return gen ? gen.toObject() : null;
}

function hasInlinedSource(existingMap) {
  return existingMap.sourcesContent && !!existingMap.sourcesContent[0];
}

function Combiner() {
  this.generator = null;
}

Combiner.prototype._addGeneratedMap = function (sourceFile, source, offset) {
  this.generator.addGeneratedMappings(sourceFile, source, offset);
  this.generator.addSourceContent(sourceFile, source);
  return this;
};

Combiner.prototype._addExistingMap = function (sourceFile, source, existingMap, offset) {
  var mappings = parse(existingMap.mappings); 
  var originalSource = existingMap.sourcesContent[0]
    , originalSourceFile = existingMap.sources[0];

  this.generator.addMappings(originalSourceFile || sourceFile, mappings, offset);
  this.generator.addSourceContent(originalSourceFile || sourceFile, originalSource);
  return this;
};

/**
 * Adds map to underlying source map.
 * If source contains a source map comment that has the source of the original file inlined it will offset these
 * mappings and include them.
 * If no source map comment is found or it has no source inlined, mappings for the file will be generated and included
 * 
 * @name addMap
 * @function
 * @param opts {Object} { sourceRoot: {String}, sourceFile: {String}, source: {String} }
 * @param offset {Object} { line: {Number}, column: {Number} }
 */
Combiner.prototype.addFile = function (opts, offset) {
  // the first added map will determine the sourceRoot (ideally they'd all be the same)
  // also since we include the original code in the map it is actually not needed
  this.generator = this.generator || createGenerator({ sourceRoot: opts.sourceRoot || '' });

  offset = offset || {};
  if (!offset.hasOwnProperty('line'))  offset.line    =  0;
  if (!offset.hasOwnProperty('column')) offset.column =  0;

  var existingMap = resolveMap(opts.source);

  return existingMap && hasInlinedSource(existingMap)
    ? this._addExistingMap(opts.sourceFile, opts.source, existingMap, offset)
    : this._addGeneratedMap(opts.sourceFile, opts.source, offset);
};

  /**
  * @name base64
  * @function
  * @return {String} base64 encoded combined source map
  */
Combiner.prototype.base64 = function () {
  return this.generator.base64Encode();
};

/**
 * @name comment
 * @function
 * @return {String} base64 encoded sourceMappingUrl comment of the combined source map
 */
Combiner.prototype.comment = function () {
  return this.generator.inlineMappingUrl();
};

/**
 * @name create
 * @function
 * @return {Object} source map combiner instance to which source maps can be added and later combined
 */
exports.create = function () { return new Combiner(); };

/**
 * @name removeComments
 * @function
 * @param src 
 * @return {String} src with all sourceMappingUrl comments removed
 */
exports.removeComments = function (src) {
  return src.replace(convert.commentRegex, '');
};