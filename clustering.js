function onLoad() {
    initScene();
    renderLoop();
}

var _circleBuffer;
var _emptyCircle;
var _squareBuffer;
var _radiusBuffer;
var _squaredIndexBuffer;
var _projectionMatrix;
var _gl;
var _pointShaderProgram;
var _backgroundShaderProgram;
var _canvas;

const _pointSize = 5;
var _points = [];

var _backgroundPoints = [];

function initScene() {

    // Get dom elements
    _canvas = document.querySelector('#glcanvas');
    _gl = _canvas.getContext('webgl2');

    if (!_gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    }

    _pointShaderProgram = createShaderProgram('pointVShader', 'pointFShader');
    _backgroundShaderProgram = createShaderProgram('backgroundVShader', 'backgroundFShader');
    
    // Create circle
    const pointCount = 150;
    var circlePoints = [];
    circlePoints.push(0);
    circlePoints.push(0);
    circlePoints = circlePoints.concat(createCircle(pointCount));

    _emptyCircle = createBuffer(_gl, 
        _gl.ARRAY_BUFFER, 
        new Float32Array(createCircle(pointCount)),
        2,
        _gl.FLOAT)
    _circleBuffer = createBuffer(_gl, 
        _gl.ARRAY_BUFFER, 
        new Float32Array(circlePoints),
        2,
        _gl.FLOAT);

    for(i = 0; i < 15; i++) {
        _points.push(vec2.fromValues(Math.random() * _canvas.width, Math.random() * _canvas.height))
    }

    // Create the background
    const squareSize = 10;
    const horizontalPoints = Math.ceil(_canvas.width / squareSize) + 1;
    const verticalPoints = Math.ceil(_canvas.height / squareSize) + 1;
    var squarePoints = [];
    var radiusValues = [];
    for(xi = 0; xi < horizontalPoints; xi++)
    {
        for(yi = 0; yi < verticalPoints; yi++)
        {
            const x = xi * squareSize;
            const y = yi * squareSize;
            squarePoints.push(x, y);
            radiusValues.push(getRadius(vec2.fromValues(x, y), 0))
        }
    }
    _squareBuffer = createBuffer(_gl, 
        _gl.ARRAY_BUFFER, 
        new Float32Array(squarePoints),
        2,
        _gl.FLOAT);
    _radiusBuffer = createBuffer(_gl,
        _gl.ARRAY_BUFFER,
        new Float32Array(radiusValues),
        1,
        _gl.FLOAT);

    var squareIndices = [];
    for(b = 0; b < horizontalPoints - 1; b++)
    {
        for(i = 0; i < verticalPoints - 1; i++)
        {
            squareIndices.push(b * verticalPoints + i);
            squareIndices.push(b * verticalPoints + i + verticalPoints);
            squareIndices.push(b * verticalPoints + i + 1);
            squareIndices.push(b * verticalPoints + i + verticalPoints);
            squareIndices.push(b * verticalPoints + i + verticalPoints + 1);
            squareIndices.push(b * verticalPoints + i + 1);
        }
    }
    _squaredIndexBuffer = createBuffer(_gl,
        _gl.ELEMENT_ARRAY_BUFFER, 
        new Int32Array(squareIndices),
        1,
        _gl.UNSIGNED_INT);

    // Create our orthographic projection matrix
    _projectionMatrix = mat4.create();
    mat4.ortho(_projectionMatrix, 0, _canvas.width, 0, _canvas.height, -1, 1);
}

function createShaderProgram(vShader, fShader) {
    // Get shader text
    const vsSource = document.getElementById(vShader).text;
    const fsSource = document.getElementById(fShader).text;
    
    const vertexShader = loadShader(_gl, _gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(_gl, _gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = _gl.createProgram();
    _gl.attachShader(shaderProgram, vertexShader);
    _gl.attachShader(shaderProgram, fragmentShader);
    _gl.linkProgram(shaderProgram);

    if (!_gl.getProgramParameter(shaderProgram, _gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + _gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: _gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            projectionMatrix: _gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: _gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };
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

function createBuffer(gl, shaderType, data, numComponents, type) {
    // Create a buffer for the square's positions.
    const positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(shaderType, positionBuffer);

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer. 
    gl.bufferData(shaderType,
        data,
        gl.STATIC_DRAW);

    return {
        buffer: positionBuffer,
        vertexCount: data.length / numComponents,
        numComponents: numComponents,
        type: type,
    };
}

function attribBuffer(gl, attribPosition, buffer) {
    const numComponents = buffer.numComponents;
    const type = buffer.type;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.vertexAttribPointer(
        attribPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        attribPosition);
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
    _gl.useProgram(_backgroundShaderProgram.program);

    // Set the shader uniforms
    _gl.uniformMatrix4fv(
        _backgroundShaderProgram.uniformLocations.projectionMatrix,
        false,
        _projectionMatrix);

    const squareMatrix = mat4.create();
    _gl.uniformMatrix4fv(
        _backgroundShaderProgram.uniformLocations.modelViewMatrix,
        false,
        squareMatrix);

    _gl.bindBuffer(_gl.ARRAY_BUFFER, _radiusBuffer.buffer);
    const radiusAttrib = _gl.getAttribLocation(_backgroundShaderProgram.program, 'aRadius');
    _gl.vertexAttribPointer(
        radiusAttrib,
        1,
        _gl.FLOAT,
        false,
        0,
        0);
    _gl.enableVertexAttribArray(radiusAttrib);
    _gl.bindBuffer(_gl.ARRAY_BUFFER, _squareBuffer.buffer);
    attribBuffer(_gl, _backgroundShaderProgram.attribLocations.positionBuffer, _squareBuffer);
    _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, _squaredIndexBuffer.buffer);
    _gl.drawElements(_gl.TRIANGLES, 
        _squaredIndexBuffer.vertexCount,
        _gl.UNSIGNED_INT, 
        0);

    // Tell WebGL to use our program when drawing
    _gl.useProgram(_pointShaderProgram.program);

    // Set the shader uniforms
    _gl.uniformMatrix4fv(
        _pointShaderProgram.uniformLocations.projectionMatrix,
        false,
        _projectionMatrix);
    
    _gl.bindBuffer(_gl.ARRAY_BUFFER, _circleBuffer.buffer);
    attribBuffer(_gl, _pointShaderProgram.attribLocations.positionBuffer, _circleBuffer);
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
            _pointShaderProgram.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix);

        const offset = 0;
        _gl.drawArrays(_gl.TRIANGLE_FAN, offset, _circleBuffer.vertexCount);
    }

    const cursorSize = getRadius(vec2.fromValues(_mouseX, _mouseY), 0);
    const cursorMatrix = mat4.create();
    mat4.translate(cursorMatrix, // destination matrix
        cursorMatrix, // matrix to translate
        vec3.fromValues(_mouseX, _mouseY, 0.0)); // amount to translate
    mat4.scale(cursorMatrix, cursorMatrix, vec3.fromValues(cursorSize, cursorSize, cursorSize));

    _gl.uniformMatrix4fv(
        _pointShaderProgram.uniformLocations.modelViewMatrix,
        false,
        cursorMatrix);

    _gl.bindBuffer(_gl.ARRAY_BUFFER, _emptyCircle.buffer);
    attribBuffer(_gl, _pointShaderProgram.attribLocations.positionBuffer, _emptyCircle);
    _gl.drawArrays(_gl.LINE_STRIP, 0, _emptyCircle.vertexCount);
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