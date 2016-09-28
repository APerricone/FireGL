glslunit = require('./test.js')

var compiler = new glslunit.compiler.DemoCompiler('void main(){}', 'void main(){ gl_FragColor.w = 0.4+0.5*0.25; }');
var result = compiler.compileProgram();
var compiledVertexSource = glslunit.Generator.getSourceCode(result.vertexAst);
var compiledFragmentSource =glslunit.Generator.getSourceCode(result.fragmentAst);
console.log(compiledVertexSource);
console.log(compiledFragmentSource);
//this.originalLength  = this.vertexSource.length + this.fragmentSource.length;
//  this.newLength = this.compiledVertexSource.length +
//      this.compiledFragmentSource.length;
//  this.percentSaved = Math.round((this.originalLength - this.newLength)*100/
//                                 this.originalLength);