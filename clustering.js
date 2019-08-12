function onLoad() {
    initScene();
    renderLoop();
}

var circleBuffer;
var _emptyCircle;
var projectionMatrix;
var gl;
var programInfo;
var canvas;

const pointSize = 10;
var _points = []

function initScene() {

    // Get dom elements
    canvas = document.querySelector('#glcanvas');
    gl = canvas.getContext('webgl');

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    }

    // Get shader text
    const vsSource = document.getElementById('vertex-shader').text;
    const fsSource = document.getElementById('fragment-shader').text;

    // Initialize a shader program; this is where all the lighting
    // for the vertices and so forth is established.
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    // Collect all the info needed to use the shader program.
    // Look up which attribute our shader program is using
    // for aVertexPosition and look up uniform locations.
    programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };

    // Create circle
    const pointCount = 150;
    var positions = [];
    positions.push(0);
    positions.push(0);
    positions = positions.concat(createCircle(pointCount));
    circleBuffer = createBuffer(gl, positions);

    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuffer.buffer);
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexPosition);

    _emptyCircle = createBuffer(gl, createCircle(pointCount))

    //gl.bindBuffer(gl.ARRAY_BUFFER, _emptyCircle.buffer);
    //const numComponents = 2;
    //const type = gl.FLOAT;
    //const normalize = false;
    //const stride = 0;
    //const offset = 0;
    //gl.vertexAttribPointer(
    //    programInfo.attribLocations.vertexPosition,
    //    numComponents,
    //    type,
    //    normalize,
    //    stride,
    //    offset);
    //gl.enableVertexAttribArray(
    //    programInfo.attribLocations.vertexPosition);

    for(i = 0; i < 15; i++) {
        _points.push(vec2.fromValues(Math.random() * canvas.width, Math.random() * canvas.height))
    }

    // Create our orthographic projection matrix
    projectionMatrix = mat4.create();
    mat4.ortho(projectionMatrix, 0, canvas.width, 0, canvas.height, -1, 1);
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

    return {
        buffer: positionBuffer,
    };
}
 
function renderLoop() {
    renderScene();
    window.setTimeout(renderLoop, 1000 / 60);
}

function renderScene() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things

    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);

    // Set the shader uniforms
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    
    //gl.bindBuffer(gl.ARRAY_BUFFER, circleBuffer.buffer);
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
        mat4.scale(modelViewMatrix, modelViewMatrix, vec3.fromValues(pointSize, pointSize, pointSize));

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix);

        const offset = 0;
        const vertexCount = 151;
        gl.drawArrays(gl.TRIANGLE_FAN, offset, vertexCount);
    }

    const blahSize = getRadius(vec2.fromValues(_mouseX, _mouseY), 3);
    const blah = mat4.create();
    mat4.translate(blah, // destination matrix
        blah, // matrix to translate
        vec3.fromValues(_mouseX, _mouseY, 0.0)); // amount to translate
    mat4.scale(blah, blah, vec3.fromValues(blahSize, blahSize, blahSize));

    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        blah);

    const offset = 0;
    const vertexCount = 151;
    gl.drawArrays(gl.LINE_STRIP, offset, vertexCount);
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
    const canvasRect = canvas.getBoundingClientRect();
    _mouseX = event.clientX - canvasRect.left;
    _mouseY = canvas.height - event.clientY + canvasRect.top;
}