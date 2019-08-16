function onLoad() {
    initScene();
    renderLoop();
}

var _circleBuffer;
var _emptyCircle;
var _projectionMatrix;
var _gl;
var _programInfo;
var _canvas;

const _pointSize = 10;
var _points = []

function initScene() {

    // Get dom elements
    _canvas = document.querySelector('#glcanvas');
    _gl = _canvas.getContext('webgl');

    if (!_gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    }

    // Get shader text
    const vsSource = document.getElementById('vertex-shader').text;
    const fsSource = document.getElementById('fragment-shader').text;

    // Initialize a shader program; this is where all the lighting
    // for the vertices and so forth is established.
    const vertexShader = loadShader(_gl, _gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(_gl, _gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program
    const shaderProgram = _gl.createProgram();
    _gl.attachShader(shaderProgram, vertexShader);
    _gl.attachShader(shaderProgram, fragmentShader);
    _gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!_gl.getProgramParameter(shaderProgram, _gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + _gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    // Collect all the info needed to use the shader program.
    // Look up which attribute our shader program is using
    // for aVertexPosition and look up uniform locations.
    _programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: _gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            projectionMatrix: _gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: _gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };

    // Create circle
    const pointCount = 150;
    var positions = [];
    positions.push(0);
    positions.push(0);
    positions = positions.concat(createCircle(pointCount));

    _emptyCircle = createBuffer(_gl, createCircle(pointCount))
    _circleBuffer = createBuffer(_gl, positions);

    for(i = 0; i < 15; i++) {
        _points.push(vec2.fromValues(Math.random() * _canvas.width, Math.random() * _canvas.height))
    }

    // Create our orthographic projection matrix
    _projectionMatrix = mat4.create();
    mat4.ortho(_projectionMatrix, 0, _canvas.width, 0, _canvas.height, -1, 1);
}

function createCircle(count) {
    var allPoints = [];
    for (var i = 0; i < count; i++)
    {
        const theta = i / (count - 1) * Math.PI * 2;
        allPoints.push(Math.cos(theta)); // X Position
        allPoints.push(Math.sin(theta)); // Y Position
    }
    return allPoints;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send the source to the shader object
    gl.shaderSource(shader, source);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function createBuffer(gl, data) {

    // Create a buffer for the square's positions.
    const positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer. 
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array(data),
        gl.STATIC_DRAW);

    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.vertexAttribPointer(
        _programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        _programInfo.attribLocations.vertexPosition);

    return {
        buffer: positionBuffer,
        vertexCount: data.length / numComponents,
    };
}
 
function renderLoop() {
    renderScene();
    window.setTimeout(renderLoop, 1000 / 60);
}

function renderScene() {
    _gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    _gl.clearDepth(1.0); // Clear everything
    _gl.enable(_gl.DEPTH_TEST); // Enable depth testing
    _gl.depthFunc(_gl.LEQUAL); // Near things obscure far things

    // Clear the canvas before we start drawing on it.
    _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

    // Tell WebGL to use our program when drawing
    _gl.useProgram(_programInfo.program);

    // Set the shader uniforms
    _gl.uniformMatrix4fv(
        _programInfo.uniformLocations.projectionMatrix,
        false,
        _projectionMatrix);
    
    _gl.bindBuffer(_gl.ARRAY_BUFFER, _circleBuffer.buffer);
    for (point of _points)
    {
        // Set the drawing position to the "identity" point, which is
        // the center of the scene.
        const modelViewMatrix = mat4.create();
    
        // Now move the drawing position a bit to where we want to
        // start drawing the square.
        mat4.translate(modelViewMatrix, // destination matrix
            modelViewMatrix, // matrix to translate
            vec3.fromValues(point[0], point[1], 0.0)); // amount to translate
        mat4.scale(modelViewMatrix, modelViewMatrix, vec3.fromValues(_pointSize, _pointSize, _pointSize));

        _gl.uniformMatrix4fv(
            _programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix);

        const offset = 0;
        _gl.drawArrays(_gl.TRIANGLE_FAN, offset, _circleBuffer.vertexCount);
    }

    const cursorSize = getRadius(vec2.fromValues(_mouseX, _mouseY), 3);
    const cursorMatrix = mat4.create();
    mat4.translate(cursorMatrix, // destination matrix
        cursorMatrix, // matrix to translate
        vec3.fromValues(_mouseX, _mouseY, 0.0)); // amount to translate
    mat4.scale(cursorMatrix, cursorMatrix, vec3.fromValues(cursorSize, cursorSize, cursorSize));

    _gl.uniformMatrix4fv(
        _programInfo.uniformLocations.modelViewMatrix,
        false,
        cursorMatrix);

    const offset = 0;
    _gl.bindBuffer(_gl.ARRAY_BUFFER, _emptyCircle.buffer);
    _gl.drawArrays(_gl.LINE_STRIP, offset, _emptyCircle.vertexCount);
}

function getRadius(targetPoint, k) {
    var distances = [];
    for(var point of _points) {
        mouseToPoint = vec2.fromValues(point[0] - targetPoint[0], point[1] - targetPoint[1]);
        distances.push(vec2.length(mouseToPoint));
    }
    distances.sort((a, b) => a - b);
    return distances[k];
}

var _mouseX = 0;
var _mouseY = 0;
function showCoords(event) {
    const canvasRect = _canvas.getBoundingClientRect();
    _mouseX = event.clientX - canvasRect.left;
    _mouseY = _canvas.height - event.clientY + canvasRect.top;
}