(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,95709,e=>{"use strict";var t=e.i(82946),a=e.i(67249),r=e.i(52379);let o=new class{constructor(e){this._canvasPool=Object.create(null),this.canvasOptions=e||{},this.enableFullScreen=!1}_createCanvasAndContext(e,a){let r=t.DOMAdapter.get().createCanvas();r.width=e,r.height=a;let o=r.getContext("2d");return{canvas:r,context:o}}getOptimalCanvasAndContext(e,t,r=1){e=Math.ceil(e*r-1e-6),t=Math.ceil(t*r-1e-6),e=(0,a.nextPow2)(e),t=(0,a.nextPow2)(t);let o=(e<<17)+(t<<1);this._canvasPool[o]||(this._canvasPool[o]=[]);let s=this._canvasPool[o].pop();return s||(s=this._createCanvasAndContext(e,t)),s}returnCanvasAndContext(e){let{width:t,height:a}=e.canvas,r=(t<<17)+(a<<1);e.context.resetTransform(),e.context.clearRect(0,0,t,a),this._canvasPool[r].push(e)}clear(){this._canvasPool={}}};r.GlobalResourceRegistry.register(o),e.s(["CanvasPool",0,o])},87768,40022,e=>{"use strict";let t={name:"local-uniform-bit",vertex:{header:`

            struct LocalUniforms {
                uTransformMatrix:mat3x3<f32>,
                uColor:vec4<f32>,
                uRound:f32,
            }

            @group(1) @binding(0) var<uniform> localUniforms : LocalUniforms;
        `,main:`
            vColor *= localUniforms.uColor;
            modelMatrix *= localUniforms.uTransformMatrix;
        `,end:`
            if(localUniforms.uRound == 1)
            {
                vPosition = vec4(roundPixels(vPosition.xy, globalUniforms.uResolution), vPosition.zw);
            }
        `}},a={...t,vertex:{...t.vertex,header:t.vertex.header.replace("group(1)","group(2)")}},r={name:"local-uniform-bit",vertex:{header:`

            uniform mat3 uTransformMatrix;
            uniform vec4 uColor;
            uniform float uRound;
        `,main:`
            vColor *= uColor;
            modelMatrix = uTransformMatrix;
        `,end:`
            if(uRound == 1.)
            {
                gl_Position.xy = roundPixels(gl_Position.xy, uResolution);
            }
        `}};e.s(["localUniformBit",0,t,"localUniformBitGl",0,r,"localUniformBitGroup2",0,a],87768);let o={name:"texture-bit",vertex:{header:`

        struct TextureUniforms {
            uTextureMatrix:mat3x3<f32>,
        }

        @group(2) @binding(2) var<uniform> textureUniforms : TextureUniforms;
        `,main:`
            uv = (textureUniforms.uTextureMatrix * vec3(uv, 1.0)).xy;
        `},fragment:{header:`
            @group(2) @binding(0) var uTexture: texture_2d<f32>;
            @group(2) @binding(1) var uSampler: sampler;


        `,main:`
            outColor = textureSample(uTexture, uSampler, vUV);
        `}},s={name:"texture-bit",vertex:{header:`
            uniform mat3 uTextureMatrix;
        `,main:`
            uv = (uTextureMatrix * vec3(uv, 1.0)).xy;
        `},fragment:{header:`
        uniform sampler2D uTexture;


        `,main:`
            outColor = texture(uTexture, vUV);
        `}};e.s(["textureBit",0,o,"textureBitGl",0,s],40022)},71935,32462,78249,43478,61031,e=>{"use strict";var t=e.i(5337),a=e.i(39334),r=e.i(4478);e.s(["UboSystem",0,class{constructor(e){this._syncFunctionHash=Object.create(null),this._adaptor=e,this._systemCheck()}_systemCheck(){if(!(0,t.unsafeEvalSupported)())throw Error("Current environment does not allow unsafe-eval, please use pixi.js/unsafe-eval module to enable support.")}ensureUniformGroup(e){let t=this.getUniformGroupData(e);e.buffer||(e.buffer=new a.Buffer({data:new Float32Array(t.layout.size/4),usage:r.BufferUsage.UNIFORM|r.BufferUsage.COPY_DST}))}getUniformGroupData(e){return this._syncFunctionHash[e._signature]||this._initUniformGroup(e)}_initUniformGroup(e){let t=e._signature,a=this._syncFunctionHash[t];if(!a){let r=Object.keys(e.uniformStructures).map(t=>e.uniformStructures[t]),o=this._adaptor.createUboElements(r),s=this._generateUboSync(o.uboElements);a=this._syncFunctionHash[t]={layout:o,syncFunction:s}}return this._syncFunctionHash[t]}_generateUboSync(e){return this._adaptor.generateUboSync(e)}syncUniformGroup(e,t,o){let s=this.getUniformGroupData(e);e.buffer||(e.buffer=new a.Buffer({data:new Float32Array(s.layout.size/4),usage:r.BufferUsage.UNIFORM|r.BufferUsage.COPY_DST}));let f=null;return t||(t=e.buffer.data,f=e.buffer.dataInt32),o||(o=0),s.syncFunction(e.uniforms,t,f,o),!0}updateUniformGroup(e){if(e.isStatic&&!e._dirtyId)return!1;e._dirtyId=0;let t=this.syncUniformGroup(e);return e.buffer.update(),t}destroy(){this._syncFunctionHash=null}}],71935);let o=[{type:"mat3x3<f32>",test:e=>void 0!==e.value.a,ubo:`
            var matrix = uv[name].toArray(true);
            data[offset] = matrix[0];
            data[offset + 1] = matrix[1];
            data[offset + 2] = matrix[2];
            data[offset + 4] = matrix[3];
            data[offset + 5] = matrix[4];
            data[offset + 6] = matrix[5];
            data[offset + 8] = matrix[6];
            data[offset + 9] = matrix[7];
            data[offset + 10] = matrix[8];
        `,uniform:`
            gl.uniformMatrix3fv(ud[name].location, false, uv[name].toArray(true));
        `},{type:"vec4<f32>",test:e=>"vec4<f32>"===e.type&&1===e.size&&void 0!==e.value.width,ubo:`
            v = uv[name];
            data[offset] = v.x;
            data[offset + 1] = v.y;
            data[offset + 2] = v.width;
            data[offset + 3] = v.height;
        `,uniform:`
            cv = ud[name].value;
            v = uv[name];
            if (cv[0] !== v.x || cv[1] !== v.y || cv[2] !== v.width || cv[3] !== v.height) {
                cv[0] = v.x;
                cv[1] = v.y;
                cv[2] = v.width;
                cv[3] = v.height;
                gl.uniform4f(ud[name].location, v.x, v.y, v.width, v.height);
            }
        `},{type:"vec2<f32>",test:e=>"vec2<f32>"===e.type&&1===e.size&&void 0!==e.value.x,ubo:`
            v = uv[name];
            data[offset] = v.x;
            data[offset + 1] = v.y;
        `,uniform:`
            cv = ud[name].value;
            v = uv[name];
            if (cv[0] !== v.x || cv[1] !== v.y) {
                cv[0] = v.x;
                cv[1] = v.y;
                gl.uniform2f(ud[name].location, v.x, v.y);
            }
        `},{type:"vec4<f32>",test:e=>"vec4<f32>"===e.type&&1===e.size&&void 0!==e.value.red,ubo:`
            v = uv[name];
            data[offset] = v.red;
            data[offset + 1] = v.green;
            data[offset + 2] = v.blue;
            data[offset + 3] = v.alpha;
        `,uniform:`
            cv = ud[name].value;
            v = uv[name];
            if (cv[0] !== v.red || cv[1] !== v.green || cv[2] !== v.blue || cv[3] !== v.alpha) {
                cv[0] = v.red;
                cv[1] = v.green;
                cv[2] = v.blue;
                cv[3] = v.alpha;
                gl.uniform4f(ud[name].location, v.red, v.green, v.blue, v.alpha);
            }
        `},{type:"vec3<f32>",test:e=>"vec3<f32>"===e.type&&1===e.size&&void 0!==e.value.red,ubo:`
            v = uv[name];
            data[offset] = v.red;
            data[offset + 1] = v.green;
            data[offset + 2] = v.blue;
        `,uniform:`
            cv = ud[name].value;
            v = uv[name];
            if (cv[0] !== v.red || cv[1] !== v.green || cv[2] !== v.blue) {
                cv[0] = v.red;
                cv[1] = v.green;
                cv[2] = v.blue;
                gl.uniform3f(ud[name].location, v.red, v.green, v.blue);
            }
        `}];function s(e,t){return`
        for (let i = 0; i < ${e*t}; i++) {
            data[offset + (((i / ${e})|0) * 4) + (i % ${e})] = v[i];
        }
    `}e.s(["uniformParsers",0,o],32462),e.s(["createUboSyncFunction",0,function(e,t,a,r){let s=[`
        var v = null;
        var v2 = null;
        var t = 0;
        var index = 0;
        var name = null;
        var arrayOffset = null;
    `],f=0;for(let n=0;n<e.length;n++){let i=e[n],u=i.data.name,v=!1,l=0;for(let e=0;e<o.length;e++)if(o[e].test(i.data)){l=i.offset/4,s.push(`name = "${u}";`,`offset += ${l-f};`,o[e][t]||o[e].ubo),v=!0;break}if(!v)if(i.data.size>1)l=i.offset/4,s.push(a(i,l-f));else{let e=r[i.data.type];l=i.offset/4,s.push(`
                    v = uv.${u};
                    offset += ${l-f};
                    ${e};
                `)}f=l}return Function("uv","data","dataInt32","offset",s.join("\n"))}],78249);let f={f32:`
        data[offset] = v;`,i32:`
        dataInt32[offset] = v;`,"vec2<f32>":`
        data[offset] = v[0];
        data[offset + 1] = v[1];`,"vec3<f32>":`
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];`,"vec4<f32>":`
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
        data[offset + 3] = v[3];`,"vec2<i32>":`
        dataInt32[offset] = v[0];
        dataInt32[offset + 1] = v[1];`,"vec3<i32>":`
        dataInt32[offset] = v[0];
        dataInt32[offset + 1] = v[1];
        dataInt32[offset + 2] = v[2];`,"vec4<i32>":`
        dataInt32[offset] = v[0];
        dataInt32[offset + 1] = v[1];
        dataInt32[offset + 2] = v[2];
        dataInt32[offset + 3] = v[3];`,"mat2x2<f32>":`
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 4] = v[2];
        data[offset + 5] = v[3];`,"mat3x3<f32>":`
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
        data[offset + 4] = v[3];
        data[offset + 5] = v[4];
        data[offset + 6] = v[5];
        data[offset + 8] = v[6];
        data[offset + 9] = v[7];
        data[offset + 10] = v[8];`,"mat4x4<f32>":`
        for (let i = 0; i < 16; i++) {
            data[offset + i] = v[i];
        }`,"mat3x2<f32>":s(3,2),"mat4x2<f32>":s(4,2),"mat2x3<f32>":s(2,3),"mat4x3<f32>":s(4,3),"mat2x4<f32>":s(2,4),"mat3x4<f32>":s(3,4)},n={...f,"mat2x2<f32>":`
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
        data[offset + 3] = v[3];
    `};e.s(["uboSyncFunctionsSTD40",0,f,"uboSyncFunctionsWGSL",0,n],43478);var i=e.i(29524),u=e.i(84037);class v extends i.default{constructor({buffer:e,offset:t,size:a}){super(),this.uid=(0,u.uid)("buffer"),this._resourceType="bufferResource",this._touched=0,this._resourceId=(0,u.uid)("resource"),this._bufferResource=!0,this.destroyed=!1,this.buffer=e,this.offset=0|t,this.size=a,this.buffer.on("change",this.onBufferChange,this)}onBufferChange(){this._resourceId=(0,u.uid)("resource"),this.emit("change",this)}destroy(e=!1){this.destroyed=!0,e&&this.buffer.destroy(),this.emit("change",this),this.buffer=null,this.removeAllListeners()}}e.s(["BufferResource",0,v],61031)},11794,22717,e=>{"use strict";var t=e.i(43235),a=e.i(27512);e.s(["ensureAttributes",0,function(e,r){for(let a in e.attributes){let o=e.attributes[a],s=r[a];s?(o.format??(o.format=s.format),o.offset??(o.offset=s.offset),o.instance??(o.instance=s.instance)):(0,t.warn)(`Attribute ${a} is not present in the shader, but is present in the geometry. Unable to infer attribute details.`)}!function(e){let{buffers:t,attributes:r}=e,o={},s={};for(let e in t){let a=t[e];o[a.uid]=0,s[a.uid]=0}for(let e in r){let t=r[e];o[t.buffer.uid]+=(0,a.getAttributeInfoFromFormat)(t.format).stride}for(let e in r){let t=r[e];t.stride??(t.stride=o[t.buffer.uid]),t.start??(t.start=s[t.buffer.uid]),s[t.buffer.uid]+=(0,a.getAttributeInfoFromFormat)(t.format).stride}}(e)}],11794);var r=e.i(30310);let o=[];o[r.STENCIL_MODES.NONE]=void 0,o[r.STENCIL_MODES.DISABLED]={stencilWriteMask:0,stencilReadMask:0},o[r.STENCIL_MODES.RENDERING_MASK_ADD]={stencilFront:{compare:"equal",passOp:"increment-clamp"},stencilBack:{compare:"equal",passOp:"increment-clamp"}},o[r.STENCIL_MODES.RENDERING_MASK_REMOVE]={stencilFront:{compare:"equal",passOp:"decrement-clamp"},stencilBack:{compare:"equal",passOp:"decrement-clamp"}},o[r.STENCIL_MODES.MASK_ACTIVE]={stencilWriteMask:0,stencilFront:{compare:"equal",passOp:"keep"},stencilBack:{compare:"equal",passOp:"keep"}},o[r.STENCIL_MODES.INVERSE_MASK_ACTIVE]={stencilWriteMask:0,stencilFront:{compare:"not-equal",passOp:"keep"},stencilBack:{compare:"not-equal",passOp:"keep"}},e.s(["GpuStencilModesToPixi",0,o],22717)}]);

//# sourceMappingURL=122i201i7jqms.js.map