var cm=Object.defineProperty;var hm=(e,t,r)=>t in e?cm(e,t,{enumerable:!0,configurable:!0,writable:!0,value:r}):e[t]=r;var Ss=(e,t,r)=>hm(e,typeof t!="symbol"?t+"":t,r);const Pr=new Map,St=[],mm=(e,t,r)=>{if(t&&typeof t.init=="function"&&typeof t.createInferenceSessionHandler=="function"){const n=Pr.get(e);if(n===void 0)Pr.set(e,{backend:t,priority:r});else{if(n.priority>r)return;if(n.priority===r&&n.backend!==t)throw new Error(`cannot register backend "${e}" using priority ${r}`)}if(r>=0){const a=St.indexOf(e);a!==-1&&St.splice(a,1);for(let i=0;i<St.length;i++)if(Pr.get(St[i]).priority<=r){St.splice(i,0,e);return}St.push(e)}return}throw new TypeError("not a valid backend")},gm=async e=>{const t=Pr.get(e);if(!t)return"backend not found.";if(t.initialized)return t.backend;if(t.aborted)return t.error;{const r=!!t.initPromise;try{return r||(t.initPromise=t.backend.init(e)),await t.initPromise,t.initialized=!0,t.backend}catch(n){return r||(t.error=`${n}`,t.aborted=!0),t.error}finally{delete t.initPromise}}},ym=async e=>{const t=e.executionProviders||[],r=t.map(d=>typeof d=="string"?d:d.name),n=r.length===0?St:r;let a;const i=[],s=new Set;for(const d of n){const l=await gm(d);typeof l=="string"?i.push({name:d,err:l}):(a||(a=l),a===l&&s.add(d))}if(!a)throw new Error(`no available backend found. ERR: ${i.map(d=>`[${d.name}] ${d.err}`).join(", ")}`);for(const{name:d,err:l}of i)r.includes(d)&&console.warn(`removing requested execution provider "${d}" from session options because it is not available: ${l}`);const u=t.filter(d=>s.has(typeof d=="string"?d:d.name));return[a,new Proxy(e,{get:(d,l)=>l==="executionProviders"?u:Reflect.get(d,l)})]},_m="1.21.0";let Is="warning";const Ke={wasm:{},webgl:{},webgpu:{},versions:{common:_m},set logLevel(e){if(e!==void 0){if(typeof e!="string"||["verbose","info","warning","error","fatal"].indexOf(e)===-1)throw new Error(`Unsupported logging level: ${e}`);Is=e}},get logLevel(){return Is}};Object.defineProperty(Ke,"logLevel",{enumerable:!0});const bm=Ke,wm=(e,t)=>{const r=typeof document<"u"?document.createElement("canvas"):new OffscreenCanvas(1,1);r.width=e.dims[3],r.height=e.dims[2];const n=r.getContext("2d");if(n!=null){let a,i;(t==null?void 0:t.tensorLayout)!==void 0&&t.tensorLayout==="NHWC"?(a=e.dims[2],i=e.dims[3]):(a=e.dims[3],i=e.dims[2]);const s=(t==null?void 0:t.format)!==void 0?t.format:"RGB",u=t==null?void 0:t.norm;let d,l;u===void 0||u.mean===void 0?d=[255,255,255,255]:typeof u.mean=="number"?d=[u.mean,u.mean,u.mean,u.mean]:(d=[u.mean[0],u.mean[1],u.mean[2],0],u.mean[3]!==void 0&&(d[3]=u.mean[3])),u===void 0||u.bias===void 0?l=[0,0,0,0]:typeof u.bias=="number"?l=[u.bias,u.bias,u.bias,u.bias]:(l=[u.bias[0],u.bias[1],u.bias[2],0],u.bias[3]!==void 0&&(l[3]=u.bias[3]));const f=i*a;let c=0,h=f,g=f*2,y=-1;s==="RGBA"?(c=0,h=f,g=f*2,y=f*3):s==="RGB"?(c=0,h=f,g=f*2):s==="RBG"&&(c=0,g=f,h=f*2);for(let b=0;b<i;b++)for(let x=0;x<a;x++){const $=(e.data[c++]-l[0])*d[0],w=(e.data[h++]-l[1])*d[1],S=(e.data[g++]-l[2])*d[2],T=y===-1?255:(e.data[y++]-l[3])*d[3];n.fillStyle="rgba("+$+","+w+","+S+","+T+")",n.fillRect(x,b,1,1)}if("toDataURL"in r)return r.toDataURL();throw new Error("toDataURL is not supported")}else throw new Error("Can not access image data")},$m=(e,t)=>{const r=typeof document<"u"?document.createElement("canvas").getContext("2d"):new OffscreenCanvas(1,1).getContext("2d");let n;if(r!=null){let a,i,s;(t==null?void 0:t.tensorLayout)!==void 0&&t.tensorLayout==="NHWC"?(a=e.dims[2],i=e.dims[1],s=e.dims[3]):(a=e.dims[3],i=e.dims[2],s=e.dims[1]);const u=t!==void 0&&t.format!==void 0?t.format:"RGB",d=t==null?void 0:t.norm;let l,f;d===void 0||d.mean===void 0?l=[255,255,255,255]:typeof d.mean=="number"?l=[d.mean,d.mean,d.mean,d.mean]:(l=[d.mean[0],d.mean[1],d.mean[2],255],d.mean[3]!==void 0&&(l[3]=d.mean[3])),d===void 0||d.bias===void 0?f=[0,0,0,0]:typeof d.bias=="number"?f=[d.bias,d.bias,d.bias,d.bias]:(f=[d.bias[0],d.bias[1],d.bias[2],0],d.bias[3]!==void 0&&(f[3]=d.bias[3]));const c=i*a;if(t!==void 0&&(t.format!==void 0&&s===4&&t.format!=="RGBA"||s===3&&t.format!=="RGB"&&t.format!=="BGR"))throw new Error("Tensor format doesn't match input tensor dims");const h=4;let g=0,y=1,b=2,x=3,$=0,w=c,S=c*2,T=-1;u==="RGBA"?($=0,w=c,S=c*2,T=c*3):u==="RGB"?($=0,w=c,S=c*2):u==="RBG"&&($=0,S=c,w=c*2),n=r.createImageData(a,i);for(let I=0;I<i*a;g+=h,y+=h,b+=h,x+=h,I++)n.data[g]=(e.data[$++]-f[0])*l[0],n.data[y]=(e.data[w++]-f[1])*l[1],n.data[b]=(e.data[S++]-f[2])*l[2],n.data[x]=T===-1?255:(e.data[T++]-f[3])*l[3]}else throw new Error("Can not access image data");return n},gi=(e,t)=>{if(e===void 0)throw new Error("Image buffer must be defined");if(t.height===void 0||t.width===void 0)throw new Error("Image height and width must be defined");if(t.tensorLayout==="NHWC")throw new Error("NHWC Tensor layout is not supported yet");const{height:r,width:n}=t,a=t.norm??{mean:255,bias:0};let i,s;typeof a.mean=="number"?i=[a.mean,a.mean,a.mean,a.mean]:i=[a.mean[0],a.mean[1],a.mean[2],a.mean[3]??255],typeof a.bias=="number"?s=[a.bias,a.bias,a.bias,a.bias]:s=[a.bias[0],a.bias[1],a.bias[2],a.bias[3]??0];const u=t.format!==void 0?t.format:"RGBA",d=t.tensorFormat!==void 0&&t.tensorFormat!==void 0?t.tensorFormat:"RGB",l=r*n,f=d==="RGBA"?new Float32Array(l*4):new Float32Array(l*3);let c=4,h=0,g=1,y=2,b=3,x=0,$=l,w=l*2,S=-1;u==="RGB"&&(c=3,h=0,g=1,y=2,b=-1),d==="RGBA"?S=l*3:d==="RBG"?(x=0,w=l,$=l*2):d==="BGR"&&(w=0,$=l,x=l*2);for(let I=0;I<l;I++,h+=c,y+=c,g+=c,b+=c)f[x++]=(e[h]+s[0])/i[0],f[$++]=(e[g]+s[1])/i[1],f[w++]=(e[y]+s[2])/i[2],S!==-1&&b!==-1&&(f[S++]=(e[b]+s[3])/i[3]);return d==="RGBA"?new Ue("float32",f,[1,4,r,n]):new Ue("float32",f,[1,3,r,n])},vm=async(e,t)=>{const r=typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement,n=typeof ImageData<"u"&&e instanceof ImageData,a=typeof ImageBitmap<"u"&&e instanceof ImageBitmap,i=typeof e=="string";let s,u=t??{};const d=()=>{if(typeof document<"u")return document.createElement("canvas");if(typeof OffscreenCanvas<"u")return new OffscreenCanvas(1,1);throw new Error("Canvas is not supported")},l=f=>typeof HTMLCanvasElement<"u"&&f instanceof HTMLCanvasElement||f instanceof OffscreenCanvas?f.getContext("2d"):null;if(r){const f=d();f.width=e.width,f.height=e.height;const c=l(f);if(c!=null){let h=e.height,g=e.width;if(t!==void 0&&t.resizedHeight!==void 0&&t.resizedWidth!==void 0&&(h=t.resizedHeight,g=t.resizedWidth),t!==void 0){if(u=t,t.tensorFormat!==void 0)throw new Error("Image input config format must be RGBA for HTMLImageElement");u.tensorFormat="RGBA",u.height=h,u.width=g}else u.tensorFormat="RGBA",u.height=h,u.width=g;c.drawImage(e,0,0),s=c.getImageData(0,0,g,h).data}else throw new Error("Can not access image data")}else if(n){let f,c;if(t!==void 0&&t.resizedWidth!==void 0&&t.resizedHeight!==void 0?(f=t.resizedHeight,c=t.resizedWidth):(f=e.height,c=e.width),t!==void 0&&(u=t),u.format="RGBA",u.height=f,u.width=c,t!==void 0){const h=d();h.width=c,h.height=f;const g=l(h);if(g!=null)g.putImageData(e,0,0),s=g.getImageData(0,0,c,f).data;else throw new Error("Can not access image data")}else s=e.data}else if(a){if(t===void 0)throw new Error("Please provide image config with format for Imagebitmap");const f=d();f.width=e.width,f.height=e.height;const c=l(f);if(c!=null){const h=e.height,g=e.width;return c.drawImage(e,0,0,g,h),s=c.getImageData(0,0,g,h).data,u.height=h,u.width=g,gi(s,u)}else throw new Error("Can not access image data")}else{if(i)return new Promise((f,c)=>{const h=d(),g=l(h);if(!e||!g)return c();const y=new Image;y.crossOrigin="Anonymous",y.src=e,y.onload=()=>{h.width=y.width,h.height=y.height,g.drawImage(y,0,0,h.width,h.height);const b=g.getImageData(0,0,h.width,h.height);u.height=h.height,u.width=h.width,f(gi(b.data,u))}});throw new Error("Input data provided is not supported - aborted tensor creation")}if(s!==void 0)return gi(s,u);throw new Error("Input data provided is not supported - aborted tensor creation")},xm=(e,t)=>{const{width:r,height:n,download:a,dispose:i}=t,s=[1,n,r,4];return new Ue({location:"texture",type:"float32",texture:e,dims:s,download:a,dispose:i})},Tm=(e,t)=>{const{dataType:r,dims:n,download:a,dispose:i}=t;return new Ue({location:"gpu-buffer",type:r??"float32",gpuBuffer:e,dims:n,download:a,dispose:i})},Sm=(e,t)=>{const{dataType:r,dims:n,download:a,dispose:i}=t;return new Ue({location:"ml-tensor",type:r??"float32",mlTensor:e,dims:n,download:a,dispose:i})},Im=(e,t,r)=>new Ue({location:"cpu-pinned",type:e,data:t,dims:r??[t.length]}),Ut=new Map([["float32",Float32Array],["uint8",Uint8Array],["int8",Int8Array],["uint16",Uint16Array],["int16",Int16Array],["int32",Int32Array],["bool",Uint8Array],["float64",Float64Array],["uint32",Uint32Array],["int4",Uint8Array],["uint4",Uint8Array]]),Ur=new Map([[Float32Array,"float32"],[Uint8Array,"uint8"],[Int8Array,"int8"],[Uint16Array,"uint16"],[Int16Array,"int16"],[Int32Array,"int32"],[Float64Array,"float64"],[Uint32Array,"uint32"]]);let ks=!1;const km=()=>{if(!ks){ks=!0;const e=typeof BigInt64Array<"u"&&BigInt64Array.from,t=typeof BigUint64Array<"u"&&BigUint64Array.from,r=globalThis.Float16Array,n=typeof r<"u"&&r.from;e&&(Ut.set("int64",BigInt64Array),Ur.set(BigInt64Array,"int64")),t&&(Ut.set("uint64",BigUint64Array),Ur.set(BigUint64Array,"uint64")),n?(Ut.set("float16",r),Ur.set(r,"float16")):Ut.set("float16",Uint16Array)}},Em=e=>{let t=1;for(let r=0;r<e.length;r++){const n=e[r];if(typeof n!="number"||!Number.isSafeInteger(n))throw new TypeError(`dims[${r}] must be an integer, got: ${n}`);if(n<0)throw new RangeError(`dims[${r}] must be a non-negative integer, got: ${n}`);t*=n}return t},Cm=(e,t)=>{switch(e.location){case"cpu":return new Ue(e.type,e.data,t);case"cpu-pinned":return new Ue({location:"cpu-pinned",data:e.data,type:e.type,dims:t});case"texture":return new Ue({location:"texture",texture:e.texture,type:e.type,dims:t});case"gpu-buffer":return new Ue({location:"gpu-buffer",gpuBuffer:e.gpuBuffer,type:e.type,dims:t});case"ml-tensor":return new Ue({location:"ml-tensor",mlTensor:e.mlTensor,type:e.type,dims:t});default:throw new Error(`tensorReshape: tensor location ${e.location} is not supported`)}};let Ue=class{constructor(t,r,n){km();let a,i;if(typeof t=="object"&&"location"in t)switch(this.dataLocation=t.location,a=t.type,i=t.dims,t.location){case"cpu-pinned":{const u=Ut.get(a);if(!u)throw new TypeError(`unsupported type "${a}" to create tensor from pinned buffer`);if(!(t.data instanceof u))throw new TypeError(`buffer should be of type ${u.name}`);this.cpuData=t.data;break}case"texture":{if(a!=="float32")throw new TypeError(`unsupported type "${a}" to create tensor from texture`);this.gpuTextureData=t.texture,this.downloader=t.download,this.disposer=t.dispose;break}case"gpu-buffer":{if(a!=="float32"&&a!=="float16"&&a!=="int32"&&a!=="int64"&&a!=="uint32"&&a!=="uint8"&&a!=="bool"&&a!=="uint4"&&a!=="int4")throw new TypeError(`unsupported type "${a}" to create tensor from gpu buffer`);this.gpuBufferData=t.gpuBuffer,this.downloader=t.download,this.disposer=t.dispose;break}case"ml-tensor":{if(a!=="float32"&&a!=="float16"&&a!=="int32"&&a!=="int64"&&a!=="uint32"&&a!=="uint64"&&a!=="int8"&&a!=="uint8"&&a!=="bool"&&a!=="uint4"&&a!=="int4")throw new TypeError(`unsupported type "${a}" to create tensor from MLTensor`);this.mlTensorData=t.mlTensor,this.downloader=t.download,this.disposer=t.dispose;break}default:throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`)}else{let u,d;if(typeof t=="string")if(a=t,d=n,t==="string"){if(!Array.isArray(r))throw new TypeError("A string tensor's data must be a string array.");u=r}else{const l=Ut.get(t);if(l===void 0)throw new TypeError(`Unsupported tensor type: ${t}.`);if(Array.isArray(r)){if(t==="float16"&&l===Uint16Array||t==="uint4"||t==="int4")throw new TypeError(`Creating a ${t} tensor from number array is not supported. Please use ${l.name} as data.`);t==="uint64"||t==="int64"?u=l.from(r,BigInt):u=l.from(r)}else if(r instanceof l)u=r;else if(r instanceof Uint8ClampedArray)if(t==="uint8")u=Uint8Array.from(r);else throw new TypeError("A Uint8ClampedArray tensor's data must be type of uint8");else if(t==="float16"&&r instanceof Uint16Array&&l!==Uint16Array)u=new globalThis.Float16Array(r.buffer,r.byteOffset,r.length);else throw new TypeError(`A ${a} tensor's data must be type of ${l}`)}else if(d=r,Array.isArray(t)){if(t.length===0)throw new TypeError("Tensor type cannot be inferred from an empty array.");const l=typeof t[0];if(l==="string")a="string",u=t;else if(l==="boolean")a="bool",u=Uint8Array.from(t);else throw new TypeError(`Invalid element type of data array: ${l}.`)}else if(t instanceof Uint8ClampedArray)a="uint8",u=Uint8Array.from(t);else{const l=Ur.get(t.constructor);if(l===void 0)throw new TypeError(`Unsupported type for tensor data: ${t.constructor}.`);a=l,u=t}if(d===void 0)d=[u.length];else if(!Array.isArray(d))throw new TypeError("A tensor's dims must be a number array");i=d,this.cpuData=u,this.dataLocation="cpu"}const s=Em(i);if(this.cpuData&&s!==this.cpuData.length&&!((a==="uint4"||a==="int4")&&Math.ceil(s/2)===this.cpuData.length))throw new Error(`Tensor's size(${s}) does not match data length(${this.cpuData.length}).`);this.type=a,this.dims=i,this.size=s}static async fromImage(t,r){return vm(t,r)}static fromTexture(t,r){return xm(t,r)}static fromGpuBuffer(t,r){return Tm(t,r)}static fromMLTensor(t,r){return Sm(t,r)}static fromPinnedBuffer(t,r,n){return Im(t,r,n)}toDataURL(t){return wm(this,t)}toImageData(t){return $m(this,t)}get data(){if(this.ensureValid(),!this.cpuData)throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");return this.cpuData}get location(){return this.dataLocation}get texture(){if(this.ensureValid(),!this.gpuTextureData)throw new Error("The data is not stored as a WebGL texture.");return this.gpuTextureData}get gpuBuffer(){if(this.ensureValid(),!this.gpuBufferData)throw new Error("The data is not stored as a WebGPU buffer.");return this.gpuBufferData}get mlTensor(){if(this.ensureValid(),!this.mlTensorData)throw new Error("The data is not stored as a WebNN MLTensor.");return this.mlTensorData}async getData(t){switch(this.ensureValid(),this.dataLocation){case"cpu":case"cpu-pinned":return this.data;case"texture":case"gpu-buffer":case"ml-tensor":{if(!this.downloader)throw new Error("The current tensor is not created with a specified data downloader.");if(this.isDownloading)throw new Error("The current tensor is being downloaded.");try{this.isDownloading=!0;const r=await this.downloader();return this.downloader=void 0,this.dataLocation="cpu",this.cpuData=r,t&&this.disposer&&(this.disposer(),this.disposer=void 0),r}finally{this.isDownloading=!1}}default:throw new Error(`cannot get data from location: ${this.dataLocation}`)}}dispose(){if(this.isDownloading)throw new Error("The current tensor is being downloaded.");this.disposer&&(this.disposer(),this.disposer=void 0),this.cpuData=void 0,this.gpuTextureData=void 0,this.gpuBufferData=void 0,this.mlTensorData=void 0,this.downloader=void 0,this.isDownloading=void 0,this.dataLocation="none"}ensureValid(){if(this.dataLocation==="none")throw new Error("The tensor is disposed.")}reshape(t){if(this.ensureValid(),this.downloader||this.disposer)throw new Error("Cannot reshape a tensor that owns GPU resource.");return Cm(this,t)}};const Mt=Ue,od=(e,t)=>{(typeof Ke.trace>"u"?!Ke.wasm.trace:!Ke.trace)||console.timeStamp(`${e}::ORT::${t}`)},ud=(e,t)=>{var a;const r=((a=new Error().stack)==null?void 0:a.split(/\r\n|\r|\n/g))||[];let n=!1;for(let i=0;i<r.length;i++){if(n&&!r[i].includes("TRACE_FUNC")){let s=`FUNC_${e}::${r[i].trim().split(" ")[1]}`;t&&(s+=`::${t}`),od("CPU",s);return}r[i].includes("TRACE_FUNC")&&(n=!0)}},yn=e=>{(typeof Ke.trace>"u"?!Ke.wasm.trace:!Ke.trace)||ud("BEGIN",e)},_n=e=>{(typeof Ke.trace>"u"?!Ke.wasm.trace:!Ke.trace)||ud("END",e)};let zm=class ld{constructor(t){this.handler=t}async run(t,r,n){yn();const a={};let i={};if(typeof t!="object"||t===null||t instanceof Mt||Array.isArray(t))throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");let s=!0;if(typeof r=="object"){if(r===null)throw new TypeError("Unexpected argument[1]: cannot be null.");if(r instanceof Mt)throw new TypeError("'fetches' cannot be a Tensor");if(Array.isArray(r)){if(r.length===0)throw new TypeError("'fetches' cannot be an empty array.");s=!1;for(const l of r){if(typeof l!="string")throw new TypeError("'fetches' must be a string array or an object.");if(this.outputNames.indexOf(l)===-1)throw new RangeError(`'fetches' contains invalid output name: ${l}.`);a[l]=null}if(typeof n=="object"&&n!==null)i=n;else if(typeof n<"u")throw new TypeError("'options' must be an object.")}else{let l=!1;const f=Object.getOwnPropertyNames(r);for(const c of this.outputNames)if(f.indexOf(c)!==-1){const h=r[c];(h===null||h instanceof Mt)&&(l=!0,s=!1,a[c]=h)}if(l){if(typeof n=="object"&&n!==null)i=n;else if(typeof n<"u")throw new TypeError("'options' must be an object.")}else i=r}}else if(typeof r<"u")throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");for(const l of this.inputNames)if(typeof t[l]>"u")throw new Error(`input '${l}' is missing in 'feeds'.`);if(s)for(const l of this.outputNames)a[l]=null;const u=await this.handler.run(t,a,i),d={};for(const l in u)if(Object.hasOwnProperty.call(u,l)){const f=u[l];f instanceof Mt?d[l]=f:d[l]=new Mt(f.type,f.data,f.dims)}return _n(),d}async release(){return this.handler.dispose()}static async create(t,r,n,a){yn();let i,s={};if(typeof t=="string"){if(i=t,typeof r=="object"&&r!==null)s=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof Uint8Array){if(i=t,typeof r=="object"&&r!==null)s=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof ArrayBuffer||typeof SharedArrayBuffer<"u"&&t instanceof SharedArrayBuffer){const f=t;let c=0,h=t.byteLength;if(typeof r=="object"&&r!==null)s=r;else if(typeof r=="number"){if(c=r,!Number.isSafeInteger(c))throw new RangeError("'byteOffset' must be an integer.");if(c<0||c>=f.byteLength)throw new RangeError(`'byteOffset' is out of range [0, ${f.byteLength}).`);if(h=t.byteLength-c,typeof n=="number"){if(h=n,!Number.isSafeInteger(h))throw new RangeError("'byteLength' must be an integer.");if(h<=0||c+h>f.byteLength)throw new RangeError(`'byteLength' is out of range (0, ${f.byteLength-c}].`);if(typeof a=="object"&&a!==null)s=a;else if(typeof a<"u")throw new TypeError("'options' must be an object.")}else if(typeof n<"u")throw new TypeError("'byteLength' must be a number.")}else if(typeof r<"u")throw new TypeError("'options' must be an object.");i=new Uint8Array(f,c,h)}else throw new TypeError("Unexpected argument[0]: must be 'path' or 'buffer'.");const[u,d]=await ym(s),l=await u.createInferenceSessionHandler(i,d);return _n(),new ld(l)}startProfiling(){this.handler.startProfiling()}endProfiling(){this.handler.endProfiling()}get inputNames(){return this.handler.inputNames}get outputNames(){return this.handler.outputNames}};const Am=zm,ey=Object.freeze(Object.defineProperty({__proto__:null,InferenceSession:Am,TRACE:od,TRACE_FUNC_BEGIN:yn,TRACE_FUNC_END:_n,Tensor:Mt,env:bm,registerBackend:mm},Symbol.toStringTag,{value:"Module"}));/*!
 * ONNX Runtime Web v1.22.0-dev.20250409-89f8206ba4
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */var Dn=Object.defineProperty,Om=Object.getOwnPropertyDescriptor,Bm=Object.getOwnPropertyNames,Rm=Object.prototype.hasOwnProperty,Dm=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(t,r)=>(typeof require<"u"?require:t)[r]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')}),U=(e,t)=>()=>(e&&(t=e(e=0)),t),Vt=(e,t)=>{for(var r in t)Dn(e,r,{get:t[r],enumerable:!0})},Nm=(e,t,r,n)=>{if(t&&typeof t=="object"||typeof t=="function")for(let a of Bm(t))!Rm.call(e,a)&&a!==r&&Dn(e,a,{get:()=>t[a],enumerable:!(n=Om(t,a))||n.enumerable});return e},dr=e=>Nm(Dn({},"__esModule",{value:!0}),e),Zt,ct,Et,Es,dd,pd=U(()=>{Zt=new Map,ct=[],Et=(e,t,r)=>{if(t&&typeof t.init=="function"&&typeof t.createInferenceSessionHandler=="function"){let n=Zt.get(e);if(n===void 0)Zt.set(e,{backend:t,priority:r});else{if(n.priority>r)return;if(n.priority===r&&n.backend!==t)throw new Error(`cannot register backend "${e}" using priority ${r}`)}if(r>=0){let a=ct.indexOf(e);a!==-1&&ct.splice(a,1);for(let i=0;i<ct.length;i++)if(Zt.get(ct[i]).priority<=r){ct.splice(i,0,e);return}ct.push(e)}return}throw new TypeError("not a valid backend")},Es=async e=>{let t=Zt.get(e);if(!t)return"backend not found.";if(t.initialized)return t.backend;if(t.aborted)return t.error;{let r=!!t.initPromise;try{return r||(t.initPromise=t.backend.init(e)),await t.initPromise,t.initialized=!0,t.backend}catch(n){return r||(t.error=`${n}`,t.aborted=!0),t.error}finally{delete t.initPromise}}},dd=async e=>{let t=e.executionProviders||[],r=t.map(d=>typeof d=="string"?d:d.name),n=r.length===0?ct:r,a,i=[],s=new Set;for(let d of n){let l=await Es(d);typeof l=="string"?i.push({name:d,err:l}):(a||(a=l),a===l&&s.add(d))}if(!a)throw new Error(`no available backend found. ERR: ${i.map(d=>`[${d.name}] ${d.err}`).join(", ")}`);for(let{name:d,err:l}of i)r.includes(d)&&console.warn(`removing requested execution provider "${d}" from session options because it is not available: ${l}`);let u=t.filter(d=>s.has(typeof d=="string"?d:d.name));return[a,new Proxy(e,{get:(d,l)=>l==="executionProviders"?u:Reflect.get(d,l)})]}}),Mm=U(()=>{pd()}),fd,Pm=U(()=>{fd="1.22.0-dev.20250409-89f8206ba4"}),yi,Pe,cd=U(()=>{Pm(),yi="warning",Pe={wasm:{},webgl:{},webgpu:{},versions:{common:fd},set logLevel(e){if(e!==void 0){if(typeof e!="string"||["verbose","info","warning","error","fatal"].indexOf(e)===-1)throw new Error(`Unsupported logging level: ${e}`);yi=e}},get logLevel(){return yi}},Object.defineProperty(Pe,"logLevel",{enumerable:!0})}),_e,Um=U(()=>{cd(),_e=Pe}),hd,md,Wm=U(()=>{hd=(e,t)=>{let r=typeof document<"u"?document.createElement("canvas"):new OffscreenCanvas(1,1);r.width=e.dims[3],r.height=e.dims[2];let n=r.getContext("2d");if(n!=null){let a,i;(t==null?void 0:t.tensorLayout)!==void 0&&t.tensorLayout==="NHWC"?(a=e.dims[2],i=e.dims[3]):(a=e.dims[3],i=e.dims[2]);let s=(t==null?void 0:t.format)!==void 0?t.format:"RGB",u=t==null?void 0:t.norm,d,l;u===void 0||u.mean===void 0?d=[255,255,255,255]:typeof u.mean=="number"?d=[u.mean,u.mean,u.mean,u.mean]:(d=[u.mean[0],u.mean[1],u.mean[2],0],u.mean[3]!==void 0&&(d[3]=u.mean[3])),u===void 0||u.bias===void 0?l=[0,0,0,0]:typeof u.bias=="number"?l=[u.bias,u.bias,u.bias,u.bias]:(l=[u.bias[0],u.bias[1],u.bias[2],0],u.bias[3]!==void 0&&(l[3]=u.bias[3]));let f=i*a,c=0,h=f,g=f*2,y=-1;s==="RGBA"?(c=0,h=f,g=f*2,y=f*3):s==="RGB"?(c=0,h=f,g=f*2):s==="RBG"&&(c=0,g=f,h=f*2);for(let b=0;b<i;b++)for(let x=0;x<a;x++){let $=(e.data[c++]-l[0])*d[0],w=(e.data[h++]-l[1])*d[1],S=(e.data[g++]-l[2])*d[2],T=y===-1?255:(e.data[y++]-l[3])*d[3];n.fillStyle="rgba("+$+","+w+","+S+","+T+")",n.fillRect(x,b,1,1)}if("toDataURL"in r)return r.toDataURL();throw new Error("toDataURL is not supported")}else throw new Error("Can not access image data")},md=(e,t)=>{let r=typeof document<"u"?document.createElement("canvas").getContext("2d"):new OffscreenCanvas(1,1).getContext("2d"),n;if(r!=null){let a,i,s;(t==null?void 0:t.tensorLayout)!==void 0&&t.tensorLayout==="NHWC"?(a=e.dims[2],i=e.dims[1],s=e.dims[3]):(a=e.dims[3],i=e.dims[2],s=e.dims[1]);let u=t!==void 0&&t.format!==void 0?t.format:"RGB",d=t==null?void 0:t.norm,l,f;d===void 0||d.mean===void 0?l=[255,255,255,255]:typeof d.mean=="number"?l=[d.mean,d.mean,d.mean,d.mean]:(l=[d.mean[0],d.mean[1],d.mean[2],255],d.mean[3]!==void 0&&(l[3]=d.mean[3])),d===void 0||d.bias===void 0?f=[0,0,0,0]:typeof d.bias=="number"?f=[d.bias,d.bias,d.bias,d.bias]:(f=[d.bias[0],d.bias[1],d.bias[2],0],d.bias[3]!==void 0&&(f[3]=d.bias[3]));let c=i*a;if(t!==void 0&&(t.format!==void 0&&s===4&&t.format!=="RGBA"||s===3&&t.format!=="RGB"&&t.format!=="BGR"))throw new Error("Tensor format doesn't match input tensor dims");let h=4,g=0,y=1,b=2,x=3,$=0,w=c,S=c*2,T=-1;u==="RGBA"?($=0,w=c,S=c*2,T=c*3):u==="RGB"?($=0,w=c,S=c*2):u==="RBG"&&($=0,S=c,w=c*2),n=r.createImageData(a,i);for(let I=0;I<i*a;g+=h,y+=h,b+=h,x+=h,I++)n.data[g]=(e.data[$++]-f[0])*l[0],n.data[y]=(e.data[w++]-f[1])*l[1],n.data[b]=(e.data[S++]-f[2])*l[2],n.data[x]=T===-1?255:(e.data[T++]-f[3])*l[3]}else throw new Error("Can not access image data");return n}}),Tr,gd,yd,_d,bd,wd,Lm=U(()=>{Nn(),Tr=(e,t)=>{if(e===void 0)throw new Error("Image buffer must be defined");if(t.height===void 0||t.width===void 0)throw new Error("Image height and width must be defined");if(t.tensorLayout==="NHWC")throw new Error("NHWC Tensor layout is not supported yet");let{height:r,width:n}=t,a=t.norm??{mean:255,bias:0},i,s;typeof a.mean=="number"?i=[a.mean,a.mean,a.mean,a.mean]:i=[a.mean[0],a.mean[1],a.mean[2],a.mean[3]??255],typeof a.bias=="number"?s=[a.bias,a.bias,a.bias,a.bias]:s=[a.bias[0],a.bias[1],a.bias[2],a.bias[3]??0];let u=t.format!==void 0?t.format:"RGBA",d=t.tensorFormat!==void 0&&t.tensorFormat!==void 0?t.tensorFormat:"RGB",l=r*n,f=d==="RGBA"?new Float32Array(l*4):new Float32Array(l*3),c=4,h=0,g=1,y=2,b=3,x=0,$=l,w=l*2,S=-1;u==="RGB"&&(c=3,h=0,g=1,y=2,b=-1),d==="RGBA"?S=l*3:d==="RBG"?(x=0,w=l,$=l*2):d==="BGR"&&(w=0,$=l,x=l*2);for(let T=0;T<l;T++,h+=c,y+=c,g+=c,b+=c)f[x++]=(e[h]+s[0])/i[0],f[$++]=(e[g]+s[1])/i[1],f[w++]=(e[y]+s[2])/i[2],S!==-1&&b!==-1&&(f[S++]=(e[b]+s[3])/i[3]);return d==="RGBA"?new Re("float32",f,[1,4,r,n]):new Re("float32",f,[1,3,r,n])},gd=async(e,t)=>{let r=typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement,n=typeof ImageData<"u"&&e instanceof ImageData,a=typeof ImageBitmap<"u"&&e instanceof ImageBitmap,i=typeof e=="string",s,u=t??{},d=()=>{if(typeof document<"u")return document.createElement("canvas");if(typeof OffscreenCanvas<"u")return new OffscreenCanvas(1,1);throw new Error("Canvas is not supported")},l=f=>typeof HTMLCanvasElement<"u"&&f instanceof HTMLCanvasElement||f instanceof OffscreenCanvas?f.getContext("2d"):null;if(r){let f=d();f.width=e.width,f.height=e.height;let c=l(f);if(c!=null){let h=e.height,g=e.width;if(t!==void 0&&t.resizedHeight!==void 0&&t.resizedWidth!==void 0&&(h=t.resizedHeight,g=t.resizedWidth),t!==void 0){if(u=t,t.tensorFormat!==void 0)throw new Error("Image input config format must be RGBA for HTMLImageElement");u.tensorFormat="RGBA",u.height=h,u.width=g}else u.tensorFormat="RGBA",u.height=h,u.width=g;c.drawImage(e,0,0),s=c.getImageData(0,0,g,h).data}else throw new Error("Can not access image data")}else if(n){let f,c;if(t!==void 0&&t.resizedWidth!==void 0&&t.resizedHeight!==void 0?(f=t.resizedHeight,c=t.resizedWidth):(f=e.height,c=e.width),t!==void 0&&(u=t),u.format="RGBA",u.height=f,u.width=c,t!==void 0){let h=d();h.width=c,h.height=f;let g=l(h);if(g!=null)g.putImageData(e,0,0),s=g.getImageData(0,0,c,f).data;else throw new Error("Can not access image data")}else s=e.data}else if(a){if(t===void 0)throw new Error("Please provide image config with format for Imagebitmap");let f=d();f.width=e.width,f.height=e.height;let c=l(f);if(c!=null){let h=e.height,g=e.width;return c.drawImage(e,0,0,g,h),s=c.getImageData(0,0,g,h).data,u.height=h,u.width=g,Tr(s,u)}else throw new Error("Can not access image data")}else{if(i)return new Promise((f,c)=>{let h=d(),g=l(h);if(!e||!g)return c();let y=new Image;y.crossOrigin="Anonymous",y.src=e,y.onload=()=>{h.width=y.width,h.height=y.height,g.drawImage(y,0,0,h.width,h.height);let b=g.getImageData(0,0,h.width,h.height);u.height=h.height,u.width=h.width,f(Tr(b.data,u))}});throw new Error("Input data provided is not supported - aborted tensor creation")}if(s!==void 0)return Tr(s,u);throw new Error("Input data provided is not supported - aborted tensor creation")},yd=(e,t)=>{let{width:r,height:n,download:a,dispose:i}=t,s=[1,n,r,4];return new Re({location:"texture",type:"float32",texture:e,dims:s,download:a,dispose:i})},_d=(e,t)=>{let{dataType:r,dims:n,download:a,dispose:i}=t;return new Re({location:"gpu-buffer",type:r??"float32",gpuBuffer:e,dims:n,download:a,dispose:i})},bd=(e,t)=>{let{dataType:r,dims:n,download:a,dispose:i}=t;return new Re({location:"ml-tensor",type:r??"float32",mlTensor:e,dims:n,download:a,dispose:i})},wd=(e,t,r)=>new Re({location:"cpu-pinned",type:e,data:t,dims:r??[t.length]})}),It,ar,_i,$d,qm=U(()=>{It=new Map([["float32",Float32Array],["uint8",Uint8Array],["int8",Int8Array],["uint16",Uint16Array],["int16",Int16Array],["int32",Int32Array],["bool",Uint8Array],["float64",Float64Array],["uint32",Uint32Array],["int4",Uint8Array],["uint4",Uint8Array]]),ar=new Map([[Float32Array,"float32"],[Uint8Array,"uint8"],[Int8Array,"int8"],[Uint16Array,"uint16"],[Int16Array,"int16"],[Int32Array,"int32"],[Float64Array,"float64"],[Uint32Array,"uint32"]]),_i=!1,$d=()=>{if(!_i){_i=!0;let e=typeof BigInt64Array<"u"&&BigInt64Array.from,t=typeof BigUint64Array<"u"&&BigUint64Array.from,r=globalThis.Float16Array,n=typeof r<"u"&&r.from;e&&(It.set("int64",BigInt64Array),ar.set(BigInt64Array,"int64")),t&&(It.set("uint64",BigUint64Array),ar.set(BigUint64Array,"uint64")),n?(It.set("float16",r),ar.set(r,"float16")):It.set("float16",Uint16Array)}}}),vd,xd,Vm=U(()=>{Nn(),vd=e=>{let t=1;for(let r=0;r<e.length;r++){let n=e[r];if(typeof n!="number"||!Number.isSafeInteger(n))throw new TypeError(`dims[${r}] must be an integer, got: ${n}`);if(n<0)throw new RangeError(`dims[${r}] must be a non-negative integer, got: ${n}`);t*=n}return t},xd=(e,t)=>{switch(e.location){case"cpu":return new Re(e.type,e.data,t);case"cpu-pinned":return new Re({location:"cpu-pinned",data:e.data,type:e.type,dims:t});case"texture":return new Re({location:"texture",texture:e.texture,type:e.type,dims:t});case"gpu-buffer":return new Re({location:"gpu-buffer",gpuBuffer:e.gpuBuffer,type:e.type,dims:t});case"ml-tensor":return new Re({location:"ml-tensor",mlTensor:e.mlTensor,type:e.type,dims:t});default:throw new Error(`tensorReshape: tensor location ${e.location} is not supported`)}}}),Re,Nn=U(()=>{Wm(),Lm(),qm(),Vm(),Re=class{constructor(e,t,r){$d();let n,a;if(typeof e=="object"&&"location"in e)switch(this.dataLocation=e.location,n=e.type,a=e.dims,e.location){case"cpu-pinned":{let s=It.get(n);if(!s)throw new TypeError(`unsupported type "${n}" to create tensor from pinned buffer`);if(!(e.data instanceof s))throw new TypeError(`buffer should be of type ${s.name}`);this.cpuData=e.data;break}case"texture":{if(n!=="float32")throw new TypeError(`unsupported type "${n}" to create tensor from texture`);this.gpuTextureData=e.texture,this.downloader=e.download,this.disposer=e.dispose;break}case"gpu-buffer":{if(n!=="float32"&&n!=="float16"&&n!=="int32"&&n!=="int64"&&n!=="uint32"&&n!=="uint8"&&n!=="bool"&&n!=="uint4"&&n!=="int4")throw new TypeError(`unsupported type "${n}" to create tensor from gpu buffer`);this.gpuBufferData=e.gpuBuffer,this.downloader=e.download,this.disposer=e.dispose;break}case"ml-tensor":{if(n!=="float32"&&n!=="float16"&&n!=="int32"&&n!=="int64"&&n!=="uint32"&&n!=="uint64"&&n!=="int8"&&n!=="uint8"&&n!=="bool"&&n!=="uint4"&&n!=="int4")throw new TypeError(`unsupported type "${n}" to create tensor from MLTensor`);this.mlTensorData=e.mlTensor,this.downloader=e.download,this.disposer=e.dispose;break}default:throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`)}else{let s,u;if(typeof e=="string")if(n=e,u=r,e==="string"){if(!Array.isArray(t))throw new TypeError("A string tensor's data must be a string array.");s=t}else{let d=It.get(e);if(d===void 0)throw new TypeError(`Unsupported tensor type: ${e}.`);if(Array.isArray(t)){if(e==="float16"&&d===Uint16Array||e==="uint4"||e==="int4")throw new TypeError(`Creating a ${e} tensor from number array is not supported. Please use ${d.name} as data.`);e==="uint64"||e==="int64"?s=d.from(t,BigInt):s=d.from(t)}else if(t instanceof d)s=t;else if(t instanceof Uint8ClampedArray)if(e==="uint8")s=Uint8Array.from(t);else throw new TypeError("A Uint8ClampedArray tensor's data must be type of uint8");else if(e==="float16"&&t instanceof Uint16Array&&d!==Uint16Array)s=new globalThis.Float16Array(t.buffer,t.byteOffset,t.length);else throw new TypeError(`A ${n} tensor's data must be type of ${d}`)}else if(u=t,Array.isArray(e)){if(e.length===0)throw new TypeError("Tensor type cannot be inferred from an empty array.");let d=typeof e[0];if(d==="string")n="string",s=e;else if(d==="boolean")n="bool",s=Uint8Array.from(e);else throw new TypeError(`Invalid element type of data array: ${d}.`)}else if(e instanceof Uint8ClampedArray)n="uint8",s=Uint8Array.from(e);else{let d=ar.get(e.constructor);if(d===void 0)throw new TypeError(`Unsupported type for tensor data: ${e.constructor}.`);n=d,s=e}if(u===void 0)u=[s.length];else if(!Array.isArray(u))throw new TypeError("A tensor's dims must be a number array");a=u,this.cpuData=s,this.dataLocation="cpu"}let i=vd(a);if(this.cpuData&&i!==this.cpuData.length&&!((n==="uint4"||n==="int4")&&Math.ceil(i/2)===this.cpuData.length))throw new Error(`Tensor's size(${i}) does not match data length(${this.cpuData.length}).`);this.type=n,this.dims=a,this.size=i}static async fromImage(e,t){return gd(e,t)}static fromTexture(e,t){return yd(e,t)}static fromGpuBuffer(e,t){return _d(e,t)}static fromMLTensor(e,t){return bd(e,t)}static fromPinnedBuffer(e,t,r){return wd(e,t,r)}toDataURL(e){return hd(this,e)}toImageData(e){return md(this,e)}get data(){if(this.ensureValid(),!this.cpuData)throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");return this.cpuData}get location(){return this.dataLocation}get texture(){if(this.ensureValid(),!this.gpuTextureData)throw new Error("The data is not stored as a WebGL texture.");return this.gpuTextureData}get gpuBuffer(){if(this.ensureValid(),!this.gpuBufferData)throw new Error("The data is not stored as a WebGPU buffer.");return this.gpuBufferData}get mlTensor(){if(this.ensureValid(),!this.mlTensorData)throw new Error("The data is not stored as a WebNN MLTensor.");return this.mlTensorData}async getData(e){switch(this.ensureValid(),this.dataLocation){case"cpu":case"cpu-pinned":return this.data;case"texture":case"gpu-buffer":case"ml-tensor":{if(!this.downloader)throw new Error("The current tensor is not created with a specified data downloader.");if(this.isDownloading)throw new Error("The current tensor is being downloaded.");try{this.isDownloading=!0;let t=await this.downloader();return this.downloader=void 0,this.dataLocation="cpu",this.cpuData=t,e&&this.disposer&&(this.disposer(),this.disposer=void 0),t}finally{this.isDownloading=!1}}default:throw new Error(`cannot get data from location: ${this.dataLocation}`)}}dispose(){if(this.isDownloading)throw new Error("The current tensor is being downloaded.");this.disposer&&(this.disposer(),this.disposer=void 0),this.cpuData=void 0,this.gpuTextureData=void 0,this.gpuBufferData=void 0,this.mlTensorData=void 0,this.downloader=void 0,this.isDownloading=void 0,this.dataLocation="none"}ensureValid(){if(this.dataLocation==="none")throw new Error("The tensor is disposed.")}reshape(e){if(this.ensureValid(),this.downloader||this.disposer)throw new Error("Cannot reshape a tensor that owns GPU resource.");return xd(this,e)}}}),Fe,Td=U(()=>{Nn(),Fe=Re}),pr,bi,Ze,We,Sd=U(()=>{cd(),pr=(e,t)=>{(typeof Pe.trace>"u"?!Pe.wasm.trace:!Pe.trace)||console.timeStamp(`${e}::ORT::${t}`)},bi=(e,t)=>{var a;let r=((a=new Error().stack)==null?void 0:a.split(/\r\n|\r|\n/g))||[],n=!1;for(let i=0;i<r.length;i++){if(n&&!r[i].includes("TRACE_FUNC")){let s=`FUNC_${e}::${r[i].trim().split(" ")[1]}`;t&&(s+=`::${t}`),pr("CPU",s);return}r[i].includes("TRACE_FUNC")&&(n=!0)}},Ze=e=>{(typeof Pe.trace>"u"?!Pe.wasm.trace:!Pe.trace)||bi("BEGIN",e)},We=e=>{(typeof Pe.trace>"u"?!Pe.wasm.trace:!Pe.trace)||bi("END",e)}}),Id,jm=U(()=>{pd(),Td(),Sd(),Id=class kd{constructor(t){this.handler=t}async run(t,r,n){Ze();let a={},i={};if(typeof t!="object"||t===null||t instanceof Fe||Array.isArray(t))throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");let s=!0;if(typeof r=="object"){if(r===null)throw new TypeError("Unexpected argument[1]: cannot be null.");if(r instanceof Fe)throw new TypeError("'fetches' cannot be a Tensor");if(Array.isArray(r)){if(r.length===0)throw new TypeError("'fetches' cannot be an empty array.");s=!1;for(let l of r){if(typeof l!="string")throw new TypeError("'fetches' must be a string array or an object.");if(this.outputNames.indexOf(l)===-1)throw new RangeError(`'fetches' contains invalid output name: ${l}.`);a[l]=null}if(typeof n=="object"&&n!==null)i=n;else if(typeof n<"u")throw new TypeError("'options' must be an object.")}else{let l=!1,f=Object.getOwnPropertyNames(r);for(let c of this.outputNames)if(f.indexOf(c)!==-1){let h=r[c];(h===null||h instanceof Fe)&&(l=!0,s=!1,a[c]=h)}if(l){if(typeof n=="object"&&n!==null)i=n;else if(typeof n<"u")throw new TypeError("'options' must be an object.")}else i=r}}else if(typeof r<"u")throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");for(let l of this.inputNames)if(typeof t[l]>"u")throw new Error(`input '${l}' is missing in 'feeds'.`);if(s)for(let l of this.outputNames)a[l]=null;let u=await this.handler.run(t,a,i),d={};for(let l in u)if(Object.hasOwnProperty.call(u,l)){let f=u[l];f instanceof Fe?d[l]=f:d[l]=new Fe(f.type,f.data,f.dims)}return We(),d}async release(){return this.handler.dispose()}static async create(t,r,n,a){Ze();let i,s={};if(typeof t=="string"){if(i=t,typeof r=="object"&&r!==null)s=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof Uint8Array){if(i=t,typeof r=="object"&&r!==null)s=r;else if(typeof r<"u")throw new TypeError("'options' must be an object.")}else if(t instanceof ArrayBuffer||typeof SharedArrayBuffer<"u"&&t instanceof SharedArrayBuffer){let f=t,c=0,h=t.byteLength;if(typeof r=="object"&&r!==null)s=r;else if(typeof r=="number"){if(c=r,!Number.isSafeInteger(c))throw new RangeError("'byteOffset' must be an integer.");if(c<0||c>=f.byteLength)throw new RangeError(`'byteOffset' is out of range [0, ${f.byteLength}).`);if(h=t.byteLength-c,typeof n=="number"){if(h=n,!Number.isSafeInteger(h))throw new RangeError("'byteLength' must be an integer.");if(h<=0||c+h>f.byteLength)throw new RangeError(`'byteLength' is out of range (0, ${f.byteLength-c}].`);if(typeof a=="object"&&a!==null)s=a;else if(typeof a<"u")throw new TypeError("'options' must be an object.")}else if(typeof n<"u")throw new TypeError("'byteLength' must be a number.")}else if(typeof r<"u")throw new TypeError("'options' must be an object.");i=new Uint8Array(f,c,h)}else throw new TypeError("Unexpected argument[0]: must be 'path' or 'buffer'.");let[u,d]=await dd(s),l=await u.createInferenceSessionHandler(i,d);return We(),new kd(l)}startProfiling(){this.handler.startProfiling()}endProfiling(){this.handler.endProfiling()}get inputNames(){return this.handler.inputNames}get outputNames(){return this.handler.outputNames}get inputMetadata(){return this.handler.inputMetadata}get outputMetadata(){return this.handler.outputMetadata}}}),Mn,Gm=U(()=>{jm(),Mn=Id}),Hm=U(()=>{}),Fm=U(()=>{}),Km=U(()=>{}),Zm=U(()=>{}),Ed={};Vt(Ed,{InferenceSession:()=>Mn,TRACE:()=>pr,TRACE_FUNC_BEGIN:()=>Ze,TRACE_FUNC_END:()=>We,Tensor:()=>Fe,env:()=>_e,registerBackend:()=>Et});var Qe=U(()=>{Mm(),Um(),Gm(),Td(),Hm(),Fm(),Sd(),Km(),Zm()}),Pn=U(()=>{}),Cd={};Vt(Cd,{default:()=>zd});var wi,$i,zd,Qm=U(()=>{var e;Nc(),Ot(),Un(),wi="ort-wasm-proxy-worker",$i=((e=globalThis.self)==null?void 0:e.name)===wi,$i&&(self.onmessage=t=>{let{type:r,in:n}=t.data;try{switch(r){case"init-wasm":Wn(n.wasm).then(()=>{na(n).then(()=>{postMessage({type:r})},a=>{postMessage({type:r,err:a})})},a=>{postMessage({type:r,err:a})});break;case"init-ep":{let{epName:a,env:i}=n;aa(i,a).then(()=>{postMessage({type:r})},s=>{postMessage({type:r,err:s})});break}case"copy-from":{let{buffer:a}=n,i=Kr(a);postMessage({type:r,out:i});break}case"create":{let{model:a,options:i}=n;sa(a,i).then(s=>{postMessage({type:r,out:s})},s=>{postMessage({type:r,err:s})});break}case"release":oa(n),postMessage({type:r});break;case"run":{let{sessionId:a,inputIndices:i,inputs:s,outputIndices:u,options:d}=n;ua(a,i,s,u,new Array(u.length).fill(null),d).then(l=>{l.some(f=>f[3]!=="cpu")?postMessage({type:r,err:"Proxy does not support non-cpu tensor location."}):postMessage({type:r,out:l},da([...s,...l]))},l=>{postMessage({type:r,err:l})});break}case"end-profiling":la(n),postMessage({type:r});break;default:}}catch(a){postMessage({type:r,err:a})}}),zd=$i?null:t=>new Worker(t??Be,{type:"module",name:wi})}),Ad={};Vt(Ad,{default:()=>Od});var vi,xi,Od,Cs,Xm=U(()=>{var e,t;xi=(vi=import.meta.url,async function(r={}){var Ts;var n,a,i=r,s=new Promise((o,p)=>{n=o,a=p}),u=typeof window=="object",d=typeof WorkerGlobalScope<"u",l=d&&((Ts=self.name)==null?void 0:Ts.startsWith("em-pthread"));i.mountExternalData=(o,p)=>{o.startsWith("./")&&(o=o.substring(2)),(i.Eb||(i.Eb=new Map)).set(o,p)},i.unmountExternalData=()=>{delete i.Eb};var f=globalThis.SharedArrayBuffer??new WebAssembly.Memory({initial:0,maximum:0,pc:!0}).buffer.constructor;let c=o=>async(...p)=>{var m;try{if(i.Fb)throw Error("Session already started");let _=i.Fb={dc:p[0],errors:[]},v=await o(...p);if(i.Fb!==_)throw Error("Session mismatch");(m=i.Jb)==null||m.flush();let k=_.errors;if(0<k.length){let B=await Promise.all(k);if(B=B.filter(M=>M),0<B.length)throw Error(B.join(`
`))}return v}finally{i.Fb=null}};i.jsepInit=(o,p)=>{if(o==="webgpu"){[i.Jb,i.Ub,i.Yb,i.Kb,i.Xb,i.jb,i.Zb,i.ac,i.Vb,i.Wb,i.$b]=p;let m=i.Jb;i.jsepRegisterBuffer=(_,v,k,B)=>m.registerBuffer(_,v,k,B),i.jsepGetBuffer=_=>m.getBuffer(_),i.jsepCreateDownloader=(_,v,k)=>m.createDownloader(_,v,k),i.jsepOnCreateSession=_=>{m.onCreateSession(_)},i.jsepOnReleaseSession=_=>{m.onReleaseSession(_)},i.jsepOnRunStart=_=>m.onRunStart(_),i.bc=(_,v)=>{m.upload(_,v)}}else if(o==="webnn"){let m=p[0];[i.nc,i.Nb,i.webnnEnsureTensor,i.Ob,i.webnnDownloadTensor]=p.slice(1),i.webnnReleaseTensorId=i.Nb,i.webnnUploadTensor=i.Ob,i.webnnOnRunStart=_=>m.onRunStart(_),i.webnnOnRunEnd=m.onRunEnd.bind(m),i.webnnRegisterMLContext=(_,v)=>{m.registerMLContext(_,v)},i.webnnOnReleaseSession=_=>{m.onReleaseSession(_)},i.webnnCreateMLTensorDownloader=(_,v)=>m.createMLTensorDownloader(_,v),i.webnnRegisterMLTensor=(_,v,k,B)=>m.registerMLTensor(_,v,k,B),i.webnnCreateMLContext=_=>m.createMLContext(_),i.webnnRegisterMLConstant=(_,v,k,B,M,q)=>m.registerMLConstant(_,v,k,B,M,i.Eb,q),i.webnnRegisterGraphInput=m.registerGraphInput.bind(m),i.webnnIsGraphInput=m.isGraphInput.bind(m),i.webnnCreateTemporaryTensor=m.createTemporaryTensor.bind(m),i.webnnIsInt64Supported=m.isInt64Supported.bind(m)}};let h=()=>{let o=(p,m,_)=>(...v)=>{let k=Je,B=m==null?void 0:m();v=p(...v);let M=m==null?void 0:m();return B!==M&&(p=M,_(B),m=_=null),Je!=k?new Promise((q,K)=>{ui={resolve:q,reject:K}}):v};(()=>{for(let p of["_OrtAppendExecutionProvider","_OrtCreateSession","_OrtRun","_OrtRunWithBinding","_OrtBindInput"])i[p]=o(i[p],()=>i[p],m=>i[p]=m)})(),c!==void 0&&(i._OrtRun=c(i._OrtRun),i._OrtRunWithBinding=c(i._OrtRunWithBinding)),h=void 0};i.asyncInit=()=>{h==null||h()};var g,y,b=Object.assign({},i),x=(o,p)=>{throw p},$="";(u||d)&&(d?$=self.location.href:typeof document<"u"&&document.currentScript&&($=document.currentScript.src),vi&&($=vi),$=$.startsWith("blob:")?"":$.slice(0,$.replace(/[?#].*/,"").lastIndexOf("/")+1),d&&(y=o=>{var p=new XMLHttpRequest;return p.open("GET",o,!1),p.responseType="arraybuffer",p.send(null),new Uint8Array(p.response)}),g=async o=>{if(D(o))return new Promise((m,_)=>{var v=new XMLHttpRequest;v.open("GET",o,!0),v.responseType="arraybuffer",v.onload=()=>{v.status==200||v.status==0&&v.response?m(v.response):_(v.status)},v.onerror=_,v.send(null)});var p=await fetch(o,{credentials:"same-origin"});if(p.ok)return p.arrayBuffer();throw Error(p.status+" : "+p.url)});var w=console.log.bind(console),S=console.error.bind(console),T=w,I=S;Object.assign(i,b),b=null;var E,C,A,O,W,X,G,Q,oe,te,V,L,le,ee=i.wasmBinary,ne=!1,D=o=>o.startsWith("file://");function P(){return E.buffer!=O.buffer&&ce(),O}function j(){return E.buffer!=O.buffer&&ce(),W}function se(){return E.buffer!=O.buffer&&ce(),X}function Se(){return E.buffer!=O.buffer&&ce(),G}function N(){return E.buffer!=O.buffer&&ce(),Q}function me(){return E.buffer!=O.buffer&&ce(),oe}function Ne(){return E.buffer!=O.buffer&&ce(),te}function ze(){return E.buffer!=O.buffer&&ce(),le}if(l){let o=function(p){try{var m=p.data,_=m.Bb;if(_==="load"){let v=[];self.onmessage=k=>v.push(k),self.startWorker=()=>{postMessage({Bb:"loaded"});for(let k of v)o(k);self.onmessage=o};for(let k of m.Rb)i[k]&&!i[k].proxy||(i[k]=(...B)=>{postMessage({Bb:"callHandler",Qb:k,args:B})},k=="print"&&(T=i[k]),k=="printErr"&&(I=i[k]));E=m.kc,ce(),_t(m.lc)}else if(_==="run"){Qc(m.Ab),fi(m.Ab,0,0,1,0,0),_a(),si(m.Ab),xe||(fs(),xe=!0);try{Xc(m.fc,m.Hb)}catch(v){if(v!="unwind")throw v}}else m.target!=="setimmediate"&&(_==="checkMailbox"?xe&&cr():_&&(I(`worker: received unknown command ${_}`),I(m)))}catch(v){throw cs(),v}};var _t,xe=!1;I=function(...p){p=p.join(" "),console.error(p)},self.alert=function(...p){postMessage({Bb:"alert",text:p.join(" "),ic:$r()})},self.onunhandledrejection=p=>{throw p.reason||p},self.onmessage=o}function ce(){var o=E.buffer;i.HEAP8=O=new Int8Array(o),i.HEAP16=X=new Int16Array(o),i.HEAPU8=W=new Uint8Array(o),i.HEAPU16=G=new Uint16Array(o),i.HEAP32=Q=new Int32Array(o),i.HEAPU32=oe=new Uint32Array(o),i.HEAPF32=te=new Float32Array(o),i.HEAPF64=le=new Float64Array(o),i.HEAP64=V=new BigInt64Array(o),i.HEAPU64=L=new BigUint64Array(o)}function Xe(){l?startWorker(i):Y.Ca()}l||(E=new WebAssembly.Memory({initial:256,maximum:65536,shared:!0}),ce());var jt,bt=0,Gt=null;function pa(){if(--bt==0&&Gt){var o=Gt;Gt=null,o()}}function ot(o){throw I(o="Aborted("+o+")"),ne=!0,o=new WebAssembly.RuntimeError(o+". Build with -sASSERTIONS for more info."),a(o),o}function fa(){return{a:{L:Zc,Aa:Kc,b:Jc,$:va,A:Sa,pa:Ia,X:Ea,Z:Ca,qa:za,na:Aa,ga:Oa,ma:Ba,J:Ra,Y:Da,V:Na,oa:Ma,W:Pa,va:eh,E:th,Q:rh,O:nh,D:sh,u:oh,r:uh,P:lh,z:gh,R:yh,ja:_h,T:bh,aa:wh,M:$h,F:vh,ia:si,sa:xh,t:Th,Ba:Sh,w:Eh,o:Ch,l:Ah,c:ii,n:Oh,j:Dh,v:Nh,p:Mh,f:Ph,s:Uh,m:Wh,e:Lh,k:qh,i:Vh,g:jh,d:Gh,da:Hh,ea:Fh,fa:Kh,ba:Ya,ca:Ja,N:es,xa:Qh,ua:Yh,h:Jh,C:em,G:tm,ta:Xh,x:rm,ra:im,U:nm,q:Zh,y:am,K:sm,S:om,za:um,ya:lm,ka:ns,la:as,_:Jr,B:ss,I:os,ha:us,H:ls,a:E,wa:Yr}}}var Zr={829644:(o,p,m,_,v)=>{if(i===void 0||!i.Eb)return 1;if((o=ve(Number(o>>>0))).startsWith("./")&&(o=o.substring(2)),!(o=i.Eb.get(o)))return 2;if(p=Number(p>>>0),m=Number(m>>>0),_=Number(_>>>0),p+m>o.byteLength)return 3;try{let k=o.subarray(p,p+m);switch(v){case 0:j().set(k,_>>>0);break;case 1:i.mc?i.mc(_,k):i.bc(_,k);break;default:return 4}return 0}catch{return 4}},830468:(o,p,m)=>{i.Ob(o,j().subarray(p>>>0,p+m>>>0))},830532:()=>i.nc(),830574:o=>{i.Nb(o)},830611:()=>{i.Vb()},830642:()=>{i.Wb()},830671:()=>{i.$b()},830696:o=>i.Ub(o),830729:o=>i.Yb(o),830761:(o,p,m)=>{i.Kb(Number(o),Number(p),Number(m),!0)},830824:(o,p,m)=>{i.Kb(Number(o),Number(p),Number(m))},830881:()=>typeof wasmOffsetConverter<"u",830938:o=>{i.jb("Abs",o,void 0)},830989:o=>{i.jb("Neg",o,void 0)},831040:o=>{i.jb("Floor",o,void 0)},831093:o=>{i.jb("Ceil",o,void 0)},831145:o=>{i.jb("Reciprocal",o,void 0)},831203:o=>{i.jb("Sqrt",o,void 0)},831255:o=>{i.jb("Exp",o,void 0)},831306:o=>{i.jb("Erf",o,void 0)},831357:o=>{i.jb("Sigmoid",o,void 0)},831412:(o,p,m)=>{i.jb("HardSigmoid",o,{alpha:p,beta:m})},831491:o=>{i.jb("Log",o,void 0)},831542:o=>{i.jb("Sin",o,void 0)},831593:o=>{i.jb("Cos",o,void 0)},831644:o=>{i.jb("Tan",o,void 0)},831695:o=>{i.jb("Asin",o,void 0)},831747:o=>{i.jb("Acos",o,void 0)},831799:o=>{i.jb("Atan",o,void 0)},831851:o=>{i.jb("Sinh",o,void 0)},831903:o=>{i.jb("Cosh",o,void 0)},831955:o=>{i.jb("Asinh",o,void 0)},832008:o=>{i.jb("Acosh",o,void 0)},832061:o=>{i.jb("Atanh",o,void 0)},832114:o=>{i.jb("Tanh",o,void 0)},832166:o=>{i.jb("Not",o,void 0)},832217:(o,p,m)=>{i.jb("Clip",o,{min:p,max:m})},832286:o=>{i.jb("Clip",o,void 0)},832338:(o,p)=>{i.jb("Elu",o,{alpha:p})},832396:o=>{i.jb("Gelu",o,void 0)},832448:o=>{i.jb("Relu",o,void 0)},832500:(o,p)=>{i.jb("LeakyRelu",o,{alpha:p})},832564:(o,p)=>{i.jb("ThresholdedRelu",o,{alpha:p})},832634:(o,p)=>{i.jb("Cast",o,{to:p})},832692:o=>{i.jb("Add",o,void 0)},832743:o=>{i.jb("Sub",o,void 0)},832794:o=>{i.jb("Mul",o,void 0)},832845:o=>{i.jb("Div",o,void 0)},832896:o=>{i.jb("Pow",o,void 0)},832947:o=>{i.jb("Equal",o,void 0)},833e3:o=>{i.jb("Greater",o,void 0)},833055:o=>{i.jb("GreaterOrEqual",o,void 0)},833117:o=>{i.jb("Less",o,void 0)},833169:o=>{i.jb("LessOrEqual",o,void 0)},833228:(o,p,m,_,v)=>{i.jb("ReduceMean",o,{keepDims:!!p,noopWithEmptyAxes:!!m,axes:_?Array.from(N().subarray(Number(_)>>>0,Number(v)>>>0)):[]})},833403:(o,p,m,_,v)=>{i.jb("ReduceMax",o,{keepDims:!!p,noopWithEmptyAxes:!!m,axes:_?Array.from(N().subarray(Number(_)>>>0,Number(v)>>>0)):[]})},833577:(o,p,m,_,v)=>{i.jb("ReduceMin",o,{keepDims:!!p,noopWithEmptyAxes:!!m,axes:_?Array.from(N().subarray(Number(_)>>>0,Number(v)>>>0)):[]})},833751:(o,p,m,_,v)=>{i.jb("ReduceProd",o,{keepDims:!!p,noopWithEmptyAxes:!!m,axes:_?Array.from(N().subarray(Number(_)>>>0,Number(v)>>>0)):[]})},833926:(o,p,m,_,v)=>{i.jb("ReduceSum",o,{keepDims:!!p,noopWithEmptyAxes:!!m,axes:_?Array.from(N().subarray(Number(_)>>>0,Number(v)>>>0)):[]})},834100:(o,p,m,_,v)=>{i.jb("ReduceL1",o,{keepDims:!!p,noopWithEmptyAxes:!!m,axes:_?Array.from(N().subarray(Number(_)>>>0,Number(v)>>>0)):[]})},834273:(o,p,m,_,v)=>{i.jb("ReduceL2",o,{keepDims:!!p,noopWithEmptyAxes:!!m,axes:_?Array.from(N().subarray(Number(_)>>>0,Number(v)>>>0)):[]})},834446:(o,p,m,_,v)=>{i.jb("ReduceLogSum",o,{keepDims:!!p,noopWithEmptyAxes:!!m,axes:_?Array.from(N().subarray(Number(_)>>>0,Number(v)>>>0)):[]})},834623:(o,p,m,_,v)=>{i.jb("ReduceSumSquare",o,{keepDims:!!p,noopWithEmptyAxes:!!m,axes:_?Array.from(N().subarray(Number(_)>>>0,Number(v)>>>0)):[]})},834803:(o,p,m,_,v)=>{i.jb("ReduceLogSumExp",o,{keepDims:!!p,noopWithEmptyAxes:!!m,axes:_?Array.from(N().subarray(Number(_)>>>0,Number(v)>>>0)):[]})},834983:o=>{i.jb("Where",o,void 0)},835036:(o,p,m)=>{i.jb("Transpose",o,{perm:p?Array.from(N().subarray(Number(p)>>>0,Number(m)>>>0)):[]})},835160:(o,p,m,_)=>{i.jb("DepthToSpace",o,{blocksize:p,mode:ve(m),format:_?"NHWC":"NCHW"})},835293:(o,p,m,_)=>{i.jb("DepthToSpace",o,{blocksize:p,mode:ve(m),format:_?"NHWC":"NCHW"})},835426:(o,p,m,_,v,k,B,M,q,K,ae,de,ge,ke,Dt)=>{i.jb("ConvTranspose",o,{format:q?"NHWC":"NCHW",autoPad:p,dilations:[m],group:_,kernelShape:[v],pads:[k,B],strides:[M],wIsConst:()=>!!P()[K>>>0],outputPadding:ae?Array.from(N().subarray(Number(ae)>>>0,Number(de)>>>0)):[],outputShape:ge?Array.from(N().subarray(Number(ge)>>>0,Number(ke)>>>0)):[],activation:ve(Dt)})},835859:(o,p,m,_,v,k,B,M,q,K,ae,de,ge,ke)=>{i.jb("ConvTranspose",o,{format:M?"NHWC":"NCHW",autoPad:p,dilations:Array.from(N().subarray(Number(m)>>>0,2+(Number(m)>>>0)>>>0)),group:_,kernelShape:Array.from(N().subarray(Number(v)>>>0,2+(Number(v)>>>0)>>>0)),pads:Array.from(N().subarray(Number(k)>>>0,4+(Number(k)>>>0)>>>0)),strides:Array.from(N().subarray(Number(B)>>>0,2+(Number(B)>>>0)>>>0)),wIsConst:()=>!!P()[q>>>0],outputPadding:K?Array.from(N().subarray(Number(K)>>>0,Number(ae)>>>0)):[],outputShape:de?Array.from(N().subarray(Number(de)>>>0,Number(ge)>>>0)):[],activation:ve(ke)})},836520:(o,p,m,_,v,k,B,M,q,K,ae,de,ge,ke,Dt)=>{i.jb("ConvTranspose",o,{format:q?"NHWC":"NCHW",autoPad:p,dilations:[m],group:_,kernelShape:[v],pads:[k,B],strides:[M],wIsConst:()=>!!P()[K>>>0],outputPadding:ae?Array.from(N().subarray(Number(ae)>>>0,Number(de)>>>0)):[],outputShape:ge?Array.from(N().subarray(Number(ge)>>>0,Number(ke)>>>0)):[],activation:ve(Dt)})},836953:(o,p,m,_,v,k,B,M,q,K,ae,de,ge,ke)=>{i.jb("ConvTranspose",o,{format:M?"NHWC":"NCHW",autoPad:p,dilations:Array.from(N().subarray(Number(m)>>>0,2+(Number(m)>>>0)>>>0)),group:_,kernelShape:Array.from(N().subarray(Number(v)>>>0,2+(Number(v)>>>0)>>>0)),pads:Array.from(N().subarray(Number(k)>>>0,4+(Number(k)>>>0)>>>0)),strides:Array.from(N().subarray(Number(B)>>>0,2+(Number(B)>>>0)>>>0)),wIsConst:()=>!!P()[q>>>0],outputPadding:K?Array.from(N().subarray(Number(K)>>>0,Number(ae)>>>0)):[],outputShape:de?Array.from(N().subarray(Number(de)>>>0,Number(ge)>>>0)):[],activation:ve(ke)})},837614:(o,p)=>{i.jb("GlobalAveragePool",o,{format:p?"NHWC":"NCHW"})},837705:(o,p,m,_,v,k,B,M,q,K,ae,de,ge,ke)=>{i.jb("AveragePool",o,{format:ke?"NHWC":"NCHW",auto_pad:p,ceil_mode:m,count_include_pad:_,storage_order:v,dilations:k?Array.from(N().subarray(Number(k)>>>0,Number(B)>>>0)):[],kernel_shape:M?Array.from(N().subarray(Number(M)>>>0,Number(q)>>>0)):[],pads:K?Array.from(N().subarray(Number(K)>>>0,Number(ae)>>>0)):[],strides:de?Array.from(N().subarray(Number(de)>>>0,Number(ge)>>>0)):[]})},838184:(o,p)=>{i.jb("GlobalAveragePool",o,{format:p?"NHWC":"NCHW"})},838275:(o,p,m,_,v,k,B,M,q,K,ae,de,ge,ke)=>{i.jb("AveragePool",o,{format:ke?"NHWC":"NCHW",auto_pad:p,ceil_mode:m,count_include_pad:_,storage_order:v,dilations:k?Array.from(N().subarray(Number(k)>>>0,Number(B)>>>0)):[],kernel_shape:M?Array.from(N().subarray(Number(M)>>>0,Number(q)>>>0)):[],pads:K?Array.from(N().subarray(Number(K)>>>0,Number(ae)>>>0)):[],strides:de?Array.from(N().subarray(Number(de)>>>0,Number(ge)>>>0)):[]})},838754:(o,p)=>{i.jb("GlobalMaxPool",o,{format:p?"NHWC":"NCHW"})},838841:(o,p,m,_,v,k,B,M,q,K,ae,de,ge,ke)=>{i.jb("MaxPool",o,{format:ke?"NHWC":"NCHW",auto_pad:p,ceil_mode:m,count_include_pad:_,storage_order:v,dilations:k?Array.from(N().subarray(Number(k)>>>0,Number(B)>>>0)):[],kernel_shape:M?Array.from(N().subarray(Number(M)>>>0,Number(q)>>>0)):[],pads:K?Array.from(N().subarray(Number(K)>>>0,Number(ae)>>>0)):[],strides:de?Array.from(N().subarray(Number(de)>>>0,Number(ge)>>>0)):[]})},839316:(o,p)=>{i.jb("GlobalMaxPool",o,{format:p?"NHWC":"NCHW"})},839403:(o,p,m,_,v,k,B,M,q,K,ae,de,ge,ke)=>{i.jb("MaxPool",o,{format:ke?"NHWC":"NCHW",auto_pad:p,ceil_mode:m,count_include_pad:_,storage_order:v,dilations:k?Array.from(N().subarray(Number(k)>>>0,Number(B)>>>0)):[],kernel_shape:M?Array.from(N().subarray(Number(M)>>>0,Number(q)>>>0)):[],pads:K?Array.from(N().subarray(Number(K)>>>0,Number(ae)>>>0)):[],strides:de?Array.from(N().subarray(Number(de)>>>0,Number(ge)>>>0)):[]})},839878:(o,p,m,_,v)=>{i.jb("Gemm",o,{alpha:p,beta:m,transA:_,transB:v})},839982:o=>{i.jb("MatMul",o,void 0)},840036:(o,p,m,_)=>{i.jb("ArgMax",o,{keepDims:!!p,selectLastIndex:!!m,axis:_})},840144:(o,p,m,_)=>{i.jb("ArgMin",o,{keepDims:!!p,selectLastIndex:!!m,axis:_})},840252:(o,p)=>{i.jb("Softmax",o,{axis:p})},840315:(o,p)=>{i.jb("Concat",o,{axis:p})},840375:(o,p,m,_,v)=>{i.jb("Split",o,{axis:p,numOutputs:m,splitSizes:_?Array.from(N().subarray(Number(_)>>>0,Number(v)>>>0)):[]})},840531:o=>{i.jb("Expand",o,void 0)},840585:(o,p)=>{i.jb("Gather",o,{axis:Number(p)})},840656:(o,p)=>{i.jb("GatherElements",o,{axis:Number(p)})},840735:(o,p)=>{i.jb("GatherND",o,{batch_dims:Number(p)})},840814:(o,p,m,_,v,k,B,M,q,K,ae)=>{i.jb("Resize",o,{antialias:p,axes:m?Array.from(N().subarray(Number(m)>>>0,Number(_)>>>0)):[],coordinateTransformMode:ve(v),cubicCoeffA:k,excludeOutside:B,extrapolationValue:M,keepAspectRatioPolicy:ve(q),mode:ve(K),nearestMode:ve(ae)})},841176:(o,p,m,_,v,k,B)=>{i.jb("Slice",o,{starts:p?Array.from(N().subarray(Number(p)>>>0,Number(m)>>>0)):[],ends:_?Array.from(N().subarray(Number(_)>>>0,Number(v)>>>0)):[],axes:k?Array.from(N().subarray(Number(k)>>>0,Number(B)>>>0)):[]})},841440:o=>{i.jb("Tile",o,void 0)},841492:(o,p,m)=>{i.jb("InstanceNormalization",o,{epsilon:p,format:m?"NHWC":"NCHW"})},841606:(o,p,m)=>{i.jb("InstanceNormalization",o,{epsilon:p,format:m?"NHWC":"NCHW"})},841720:o=>{i.jb("Range",o,void 0)},841773:(o,p)=>{i.jb("Einsum",o,{equation:ve(p)})},841854:(o,p,m,_,v)=>{i.jb("Pad",o,{mode:p,value:m,pads:_?Array.from(N().subarray(Number(_)>>>0,Number(v)>>>0)):[]})},841997:(o,p,m,_,v,k)=>{i.jb("BatchNormalization",o,{epsilon:p,momentum:m,spatial:!!v,trainingMode:!!_,format:k?"NHWC":"NCHW"})},842166:(o,p,m,_,v,k)=>{i.jb("BatchNormalization",o,{epsilon:p,momentum:m,spatial:!!v,trainingMode:!!_,format:k?"NHWC":"NCHW"})},842335:(o,p,m)=>{i.jb("CumSum",o,{exclusive:Number(p),reverse:Number(m)})},842432:(o,p,m)=>{i.jb("DequantizeLinear",o,{axis:p,blockSize:m})},842522:(o,p,m,_,v)=>{i.jb("GridSample",o,{align_corners:p,mode:ve(m),padding_mode:ve(_),format:v?"NHWC":"NCHW"})},842692:(o,p,m,_,v)=>{i.jb("GridSample",o,{align_corners:p,mode:ve(m),padding_mode:ve(_),format:v?"NHWC":"NCHW"})},842862:(o,p)=>{i.jb("ScatterND",o,{reduction:ve(p)})},842947:(o,p,m,_,v,k,B,M,q)=>{i.jb("Attention",o,{numHeads:p,isUnidirectional:m,maskFilterValue:_,scale:v,doRotary:k,qkvHiddenSizes:B?Array.from(N().subarray(Number(M)>>>0,Number(M)+B>>>0)):[],pastPresentShareBuffer:!!q})},843219:o=>{i.jb("BiasAdd",o,void 0)},843274:o=>{i.jb("BiasSplitGelu",o,void 0)},843335:o=>{i.jb("FastGelu",o,void 0)},843391:(o,p,m,_,v,k,B,M,q,K,ae,de,ge,ke,Dt,fm)=>{i.jb("Conv",o,{format:de?"NHWC":"NCHW",auto_pad:p,dilations:m?Array.from(N().subarray(Number(m)>>>0,Number(_)>>>0)):[],group:v,kernel_shape:k?Array.from(N().subarray(Number(k)>>>0,Number(B)>>>0)):[],pads:M?Array.from(N().subarray(Number(M)>>>0,Number(q)>>>0)):[],strides:K?Array.from(N().subarray(Number(K)>>>0,Number(ae)>>>0)):[],w_is_const:()=>!!P()[Number(ge)>>>0],activation:ve(ke),activation_params:Dt?Array.from(Ne().subarray(Number(Dt)>>>0,Number(fm)>>>0)):[]})},843975:o=>{i.jb("Gelu",o,void 0)},844027:(o,p,m,_,v,k,B,M,q)=>{i.jb("GroupQueryAttention",o,{numHeads:p,kvNumHeads:m,scale:_,softcap:v,doRotary:k,rotaryInterleaved:B,smoothSoftmax:M,localWindowSize:q})},844244:(o,p,m,_)=>{i.jb("LayerNormalization",o,{axis:p,epsilon:m,simplified:!!_})},844355:(o,p,m,_)=>{i.jb("LayerNormalization",o,{axis:p,epsilon:m,simplified:!!_})},844466:(o,p,m,_,v,k)=>{i.jb("MatMulNBits",o,{k:p,n:m,accuracyLevel:_,bits:v,blockSize:k})},844593:(o,p,m,_,v,k)=>{i.jb("MultiHeadAttention",o,{numHeads:p,isUnidirectional:m,maskFilterValue:_,scale:v,doRotary:k})},844752:(o,p)=>{i.jb("QuickGelu",o,{alpha:p})},844816:(o,p,m,_,v)=>{i.jb("RotaryEmbedding",o,{interleaved:!!p,numHeads:m,rotaryEmbeddingDim:_,scale:v})},844955:(o,p,m)=>{i.jb("SkipLayerNormalization",o,{epsilon:p,simplified:!!m})},845057:(o,p,m)=>{i.jb("SkipLayerNormalization",o,{epsilon:p,simplified:!!m})},845159:(o,p,m,_)=>{i.jb("GatherBlockQuantized",o,{gatherAxis:p,quantizeAxis:m,blockSize:_})},845280:o=>{i.Zb(o)},845314:(o,p)=>i.ac(Number(o),Number(p),i.Fb.dc,i.Fb.errors)};function Kc(o,p,m){return Ha(async()=>{await i.Xb(Number(o),Number(p),Number(m))})}function Zc(){return typeof wasmOffsetConverter<"u"}class Qr{constructor(p){Ss(this,"name","ExitStatus");this.message=`Program terminated with exit(${p})`,this.status=p}}var ca=o=>{o.terminate(),o.onmessage=()=>{}},Xr=[],ha=o=>{lt.length==0&&(wa(),ba(lt[0]));var p=lt.pop();if(!p)return 6;Ht.push(p),wt[o.Ab]=p,p.Ab=o.Ab;var m={Bb:"run",fc:o.ec,Hb:o.Hb,Ab:o.Ab};return p.postMessage(m,o.Mb),0},ut=0,be=(o,p,...m)=>{for(var _=2*m.length,v=mi(),k=hi(8*_),B=k>>>3,M=0;M<m.length;M++){var q=m[M];typeof q=="bigint"?(V[B+2*M]=1n,V[B+2*M+1]=q):(V[B+2*M]=0n,ze()[B+2*M+1>>>0]=q)}return o=hs(o,0,_,k,p),xr(v),o};function Yr(o){if(l)return be(0,1,o);if(A=o,!(0<ut)){for(var p of Ht)ca(p);for(p of lt)ca(p);lt=[],Ht=[],wt={},ne=!0}x(0,new Qr(o))}function ma(o){if(l)return be(1,0,o);Jr(o)}var Jr=o=>{if(A=o,l)throw ma(o),"unwind";Yr(o)},lt=[],Ht=[],ga=[],wt={},ya=o=>{var p=o.Ab;delete wt[p],lt.push(o),Ht.splice(Ht.indexOf(o),1),o.Ab=0,ms(p)};function _a(){ga.forEach(o=>o())}var ba=o=>new Promise(p=>{o.onmessage=v=>{var k=(v=v.data).Bb;if(v.Gb&&v.Gb!=$r()){var B=wt[v.Gb];B?B.postMessage(v,v.Mb):I(`Internal error! Worker sent a message "${k}" to target pthread ${v.Gb}, but that thread no longer exists!`)}else k==="checkMailbox"?cr():k==="spawnThread"?ha(v):k==="cleanupThread"?ya(wt[v.hc]):k==="loaded"?(o.loaded=!0,p(o)):k==="alert"?alert(`Thread ${v.ic}: ${v.text}`):v.target==="setimmediate"?o.postMessage(v):k==="callHandler"?i[v.Qb](...v.args):k&&I(`worker sent an unknown command ${k}`)},o.onerror=v=>{throw I(`worker sent an error! ${v.filename}:${v.lineno}: ${v.message}`),v};var m,_=[];for(m of[])i.propertyIsEnumerable(m)&&_.push(m);o.postMessage({Bb:"load",Rb:_,kc:E,lc:C})});function wa(){var o=new Worker((()=>{let p=URL;return import.meta.url>"file:"&&import.meta.url<"file;"?new p("ort.bundle.min.mjs",import.meta.url):new URL(import.meta.url)})(),{type:"module",workerData:"em-pthread",name:"em-pthread"});lt.push(o)}var Qc=o=>{ce();var p=me()[o+52>>>2>>>0];o=me()[o+56>>>2>>>0],_s(p,p-o),xr(p)},Xc=(o,p)=>{ut=0,o=bs(o,p),0<ut?A=o:ci(o)};class Yc{constructor(p){this.Ib=p-24}}function Jc(o,p,m){var _=new Yc(o>>>=0);throw p>>>=0,m>>>=0,me()[_.Ib+16>>>2>>>0]=0,me()[_.Ib+4>>>2>>>0]=p,me()[_.Ib+8>>>2>>>0]=m,o}function $a(o,p,m,_){return l?be(2,1,o,p,m,_):va(o,p,m,_)}function va(o,p,m,_){if(o>>>=0,m>>>=0,_>>>=0,f===void 0)return 6;var v=[];return l&&v.length===0?$a(o,p>>>=0,m,_):(o={ec:m,Ab:o,Hb:_,Mb:v},l?(o.Bb="spawnThread",postMessage(o,v),0):ha(o))}var xa=typeof TextDecoder<"u"?new TextDecoder:void 0,Ta=(o,p=0,m=NaN)=>{var _=(p>>>=0)+m;for(m=p;o[m]&&!(m>=_);)++m;if(16<m-p&&o.buffer&&xa)return xa.decode(o.buffer instanceof ArrayBuffer?o.subarray(p,m):o.slice(p,m));for(_="";p<m;){var v=o[p++];if(128&v){var k=63&o[p++];if((224&v)==192)_+=String.fromCharCode((31&v)<<6|k);else{var B=63&o[p++];65536>(v=(240&v)==224?(15&v)<<12|k<<6|B:(7&v)<<18|k<<12|B<<6|63&o[p++])?_+=String.fromCharCode(v):(v-=65536,_+=String.fromCharCode(55296|v>>10,56320|1023&v))}}else _+=String.fromCharCode(v)}return _},ve=(o,p)=>(o>>>=0)?Ta(j(),o,p):"";function Sa(o,p,m){return l?be(3,1,o,p,m):0}function Ia(o,p){if(l)return be(4,1,o,p)}var ka=o=>{for(var p=0,m=0;m<o.length;++m){var _=o.charCodeAt(m);127>=_?p++:2047>=_?p+=2:55296<=_&&57343>=_?(p+=4,++m):p+=3}return p},Rt=(o,p,m)=>{var _=j();if(p>>>=0,0<m){var v=p;m=p+m-1;for(var k=0;k<o.length;++k){var B=o.charCodeAt(k);if(55296<=B&&57343>=B&&(B=65536+((1023&B)<<10)|1023&o.charCodeAt(++k)),127>=B){if(p>=m)break;_[p++>>>0]=B}else{if(2047>=B){if(p+1>=m)break;_[p++>>>0]=192|B>>6}else{if(65535>=B){if(p+2>=m)break;_[p++>>>0]=224|B>>12}else{if(p+3>=m)break;_[p++>>>0]=240|B>>18,_[p++>>>0]=128|B>>12&63}_[p++>>>0]=128|B>>6&63}_[p++>>>0]=128|63&B}}_[p>>>0]=0,o=p-v}else o=0;return o};function Ea(o,p){if(l)return be(5,1,o,p)}function Ca(o,p,m){if(l)return be(6,1,o,p,m)}function za(o,p,m){return l?be(7,1,o,p,m):0}function Aa(o,p){if(l)return be(8,1,o,p)}function Oa(o,p,m){if(l)return be(9,1,o,p,m)}function Ba(o,p,m,_){if(l)return be(10,1,o,p,m,_)}function Ra(o,p,m,_){if(l)return be(11,1,o,p,m,_)}function Da(o,p,m,_){if(l)return be(12,1,o,p,m,_)}function Na(o){if(l)return be(13,1,o)}function Ma(o,p){if(l)return be(14,1,o,p)}function Pa(o,p,m){if(l)return be(15,1,o,p,m)}var Ua,dt,eh=()=>ot(""),Ye=o=>{for(var p="";j()[o>>>0];)p+=Ua[j()[o++>>>0]];return p},ei={},ti={};function rt(o,p,m={}){return(function(_,v,k={}){var B=v.name;if(!_)throw new dt(`type "${B}" must have a positive integer typeid pointer`);if(ti.hasOwnProperty(_)){if(k.Sb)return;throw new dt(`Cannot register type '${B}' twice`)}ti[_]=v,ei.hasOwnProperty(_)&&(v=ei[_],delete ei[_],v.forEach(M=>M()))})(o,p,m)}var Wa=(o,p,m)=>{switch(p){case 1:return m?_=>P()[_>>>0]:_=>j()[_>>>0];case 2:return m?_=>se()[_>>>1>>>0]:_=>Se()[_>>>1>>>0];case 4:return m?_=>N()[_>>>2>>>0]:_=>me()[_>>>2>>>0];case 8:return m?_=>V[_>>>3]:_=>L[_>>>3];default:throw new TypeError(`invalid integer width (${p}): ${o}`)}};function th(o,p,m){m>>>=0,rt(o>>>=0,{name:p=Ye(p>>>0),fromWireType:_=>_,toWireType:function(_,v){if(typeof v!="bigint"&&typeof v!="number")throw v=v===null?"null":(_=typeof v)=="object"||_==="array"||_==="function"?v.toString():""+v,new TypeError(`Cannot convert "${v}" to ${this.name}`);return typeof v=="number"&&(v=BigInt(v)),v},Cb:pt,readValueFromPointer:Wa(p,m,p.indexOf("u")==-1),Db:null})}var pt=8;function rh(o,p,m,_){rt(o>>>=0,{name:p=Ye(p>>>0),fromWireType:function(v){return!!v},toWireType:function(v,k){return k?m:_},Cb:pt,readValueFromPointer:function(v){return this.fromWireType(j()[v>>>0])},Db:null})}var ri=[],it=[];function ii(o){9<(o>>>=0)&&--it[o+1]==0&&(it[o]=void 0,ri.push(o))}var Oe=o=>{if(!o)throw new dt("Cannot use deleted val. handle = "+o);return it[o]},Me=o=>{switch(o){case void 0:return 2;case null:return 4;case!0:return 6;case!1:return 8;default:let p=ri.pop()||it.length;return it[p]=o,it[p+1]=1,p}};function ni(o){return this.fromWireType(me()[o>>>2>>>0])}var ih={name:"emscripten::val",fromWireType:o=>{var p=Oe(o);return ii(o),p},toWireType:(o,p)=>Me(p),Cb:pt,readValueFromPointer:ni,Db:null};function nh(o){return rt(o>>>0,ih)}var ah=(o,p)=>{switch(p){case 4:return function(m){return this.fromWireType(Ne()[m>>>2>>>0])};case 8:return function(m){return this.fromWireType(ze()[m>>>3>>>0])};default:throw new TypeError(`invalid float width (${p}): ${o}`)}};function sh(o,p,m){m>>>=0,rt(o>>>=0,{name:p=Ye(p>>>0),fromWireType:_=>_,toWireType:(_,v)=>v,Cb:pt,readValueFromPointer:ah(p,m),Db:null})}function oh(o,p,m,_,v){if(o>>>=0,m>>>=0,p=Ye(p>>>0),v===-1&&(v=4294967295),v=M=>M,_===0){var k=32-8*m;v=M=>M<<k>>>k}var B=p.includes("unsigned")?function(M,q){return q>>>0}:function(M,q){return q};rt(o,{name:p,fromWireType:v,toWireType:B,Cb:pt,readValueFromPointer:Wa(p,m,_!==0),Db:null})}function uh(o,p,m){function _(k){var B=me()[k>>>2>>>0];return k=me()[k+4>>>2>>>0],new v(P().buffer,k,B)}var v=[Int8Array,Uint8Array,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array,BigInt64Array,BigUint64Array][p];rt(o>>>=0,{name:m=Ye(m>>>0),fromWireType:_,Cb:pt,readValueFromPointer:_},{Sb:!0})}function lh(o,p){rt(o>>>=0,{name:p=Ye(p>>>0),fromWireType:function(m){for(var _,v=me()[m>>>2>>>0],k=m+4,B=k,M=0;M<=v;++M){var q=k+M;M!=v&&j()[q>>>0]!=0||(B=ve(B,q-B),_===void 0?_=B:(_+="\0",_+=B),B=q+1)}return et(m),_},toWireType:function(m,_){_ instanceof ArrayBuffer&&(_=new Uint8Array(_));var v=typeof _=="string";if(!(v||_ instanceof Uint8Array||_ instanceof Uint8ClampedArray||_ instanceof Int8Array))throw new dt("Cannot pass non-string to std::string");var k=v?ka(_):_.length,B=vr(4+k+1),M=B+4;if(me()[B>>>2>>>0]=k,v)Rt(_,M,k+1);else if(v)for(v=0;v<k;++v){var q=_.charCodeAt(v);if(255<q)throw et(B),new dt("String has UTF-16 code units that do not fit in 8 bits");j()[M+v>>>0]=q}else for(v=0;v<k;++v)j()[M+v>>>0]=_[v];return m!==null&&m.push(et,B),B},Cb:pt,readValueFromPointer:ni,Db(m){et(m)}})}var La=typeof TextDecoder<"u"?new TextDecoder("utf-16le"):void 0,dh=(o,p)=>{for(var m=o>>1,_=m+p/2;!(m>=_)&&Se()[m>>>0];)++m;if(32<(m<<=1)-o&&La)return La.decode(j().slice(o,m));for(m="",_=0;!(_>=p/2);++_){var v=se()[o+2*_>>>1>>>0];if(v==0)break;m+=String.fromCharCode(v)}return m},ph=(o,p,m)=>{if(m??(m=2147483647),2>m)return 0;var _=p;m=(m-=2)<2*o.length?m/2:o.length;for(var v=0;v<m;++v){var k=o.charCodeAt(v);se()[p>>>1>>>0]=k,p+=2}return se()[p>>>1>>>0]=0,p-_},fh=o=>2*o.length,ch=(o,p)=>{for(var m=0,_="";!(m>=p/4);){var v=N()[o+4*m>>>2>>>0];if(v==0)break;++m,65536<=v?(v-=65536,_+=String.fromCharCode(55296|v>>10,56320|1023&v)):_+=String.fromCharCode(v)}return _},hh=(o,p,m)=>{if(p>>>=0,m??(m=2147483647),4>m)return 0;var _=p;m=_+m-4;for(var v=0;v<o.length;++v){var k=o.charCodeAt(v);if(55296<=k&&57343>=k&&(k=65536+((1023&k)<<10)|1023&o.charCodeAt(++v)),N()[p>>>2>>>0]=k,(p+=4)+4>m)break}return N()[p>>>2>>>0]=0,p-_},mh=o=>{for(var p=0,m=0;m<o.length;++m){var _=o.charCodeAt(m);55296<=_&&57343>=_&&++m,p+=4}return p};function gh(o,p,m){if(o>>>=0,p>>>=0,m=Ye(m>>>=0),p===2)var _=dh,v=ph,k=fh,B=M=>Se()[M>>>1>>>0];else p===4&&(_=ch,v=hh,k=mh,B=M=>me()[M>>>2>>>0]);rt(o,{name:m,fromWireType:M=>{for(var q,K=me()[M>>>2>>>0],ae=M+4,de=0;de<=K;++de){var ge=M+4+de*p;de!=K&&B(ge)!=0||(ae=_(ae,ge-ae),q===void 0?q=ae:(q+="\0",q+=ae),ae=ge+p)}return et(M),q},toWireType:(M,q)=>{if(typeof q!="string")throw new dt(`Cannot pass non-string to C++ string type ${m}`);var K=k(q),ae=vr(4+K+p);return me()[ae>>>2>>>0]=K/p,v(q,ae+4,K+p),M!==null&&M.push(et,ae),ae},Cb:pt,readValueFromPointer:ni,Db(M){et(M)}})}function yh(o,p){rt(o>>>=0,{Tb:!0,name:p=Ye(p>>>0),Cb:0,fromWireType:()=>{},toWireType:()=>{}})}function _h(o){fi(o>>>0,!d,1,!u,131072,!1),_a()}var ai=o=>{if(!ne)try{if(o(),!(0<ut))try{l?ci(A):Jr(A)}catch(p){p instanceof Qr||p=="unwind"||x(0,p)}}catch(p){p instanceof Qr||p=="unwind"||x(0,p)}};function si(o){o>>>=0,typeof Atomics.jc=="function"&&(Atomics.jc(N(),o>>>2,o).value.then(cr),o+=128,Atomics.store(N(),o>>>2,1))}var cr=()=>{var o=$r();o&&(si(o),ai(ys))};function bh(o,p){(o>>>=0)==p>>>0?setTimeout(cr):l?postMessage({Gb:o,Bb:"checkMailbox"}):(o=wt[o])&&o.postMessage({Bb:"checkMailbox"})}var oi=[];function wh(o,p,m,_,v){for(p>>>=0,_/=2,oi.length=_,m=v>>>0>>>3,v=0;v<_;v++)oi[v]=V[m+2*v]?V[m+2*v+1]:ze()[m+2*v+1>>>0];return(p?Zr[p]:pm[o])(...oi)}var $h=()=>{ut=0};function vh(o){o>>>=0,l?postMessage({Bb:"cleanupThread",hc:o}):ya(wt[o])}function xh(o){}var hr=(o,p)=>{var m=ti[o];if(m===void 0)throw o=ps(o),m=Ye(o),et(o),new dt(`${p} has unknown type ${m}`);return m},qa=(o,p,m)=>{var _=[];return o=o.toWireType(_,m),_.length&&(me()[p>>>2>>>0]=Me(_)),o};function Th(o,p,m){return p>>>=0,m>>>=0,o=Oe(o>>>0),p=hr(p,"emval::as"),qa(p,m,o)}function Sh(o,p){return p>>>=0,o=Oe(o>>>0),(p=hr(p,"emval::as")).toWireType(null,o)}var mr=o=>{try{o()}catch(p){ot(p)}},ft=0,Je=null,Va=0,gr=[],ja={},Ga={},Ih=0,ui=null,kh=[];function Ha(o){return(function(p){if(!ne){if(ft===0){var m=!1,_=!1;p((v=0)=>{if(!ne&&(Va=v,m=!0,_)){ft=2,mr(()=>vs(Je)),typeof MainLoop<"u"&&MainLoop.Pb&&MainLoop.resume(),v=!1;try{var k=(function(){var q=N()[Je+8>>>2>>>0];return q=Y[Ga[q]],--ut,q()})()}catch(q){k=q,v=!0}var B=!1;if(!Je){var M=ui;M&&(ui=null,(v?M.reject:M.resolve)(k),B=!0)}if(v&&!B)throw k}}),_=!0,m||(ft=1,Je=(function(){var v=vr(65548),k=v+12;me()[v>>>2>>>0]=k,me()[v+4>>>2>>>0]=k+65536,k=gr[0];var B=ja[k];return B===void 0&&(B=Ih++,ja[k]=B,Ga[B]=k),k=B,N()[v+8>>>2>>>0]=k,v})(),typeof MainLoop<"u"&&MainLoop.Pb&&MainLoop.pause(),mr(()=>ws(Je)))}else ft===2?(ft=0,mr(xs),et(Je),Je=null,kh.forEach(ai)):ot(`invalid state: ${ft}`);return Va}})(p=>{o().then(p)})}function Eh(o){return o>>>=0,Ha(async()=>{var p=await Oe(o);return Me(p)})}var yr=[];function Ch(o,p,m,_){return m>>>=0,_>>>=0,(o=yr[o>>>0])(null,p=Oe(p>>>0),m,_)}var zh={},_r=o=>{var p=zh[o];return p===void 0?Ye(o):p};function Ah(o,p,m,_,v){return m>>>=0,_>>>=0,v>>>=0,(o=yr[o>>>0])(p=Oe(p>>>0),p[m=_r(m)],_,v)}var Fa=()=>typeof globalThis=="object"?globalThis:Function("return this")();function Oh(o){return(o>>>=0)==0?Me(Fa()):(o=_r(o),Me(Fa()[o]))}var Bh=o=>{var p=yr.length;return yr.push(o),p},Rh=(o,p)=>{for(var m=Array(o),_=0;_<o;++_)m[_]=hr(me()[p+4*_>>>2>>>0],"parameter "+_);return m},Ka=(o,p)=>Object.defineProperty(p,"name",{value:o});function Dh(o,p,m){var _=(p=Rh(o,p>>>0)).shift();o--;var v=`return function (obj, func, destructorsRef, args) {
`,k=0,B=[];m===0&&B.push("obj");for(var M=["retType"],q=[_],K=0;K<o;++K)B.push("arg"+K),M.push("argType"+K),q.push(p[K]),v+=`  var arg${K} = argType${K}.readValueFromPointer(args${k?"+"+k:""});
`,k+=p[K].Cb;return v+=`  var rv = ${m===1?"new func":"func.call"}(${B.join(", ")});
`,_.Tb||(M.push("emval_returnValue"),q.push(qa),v+=`  return emval_returnValue(retType, destructorsRef, rv);
`),M.push(v+`};
`),o=(function(ae){var de=Function;if(!(de instanceof Function))throw new TypeError(`new_ called with constructor type ${typeof de} which is not a function`);var ge=Ka(de.name||"unknownFunctionName",function(){});return ge.prototype=de.prototype,ge=new ge,(ae=de.apply(ge,ae))instanceof Object?ae:ge})(M)(...q),m=`methodCaller<(${p.map(ae=>ae.name).join(", ")}) => ${_.name}>`,Bh(Ka(m,o))}function Nh(o){return o=_r(o>>>0),Me(i[o])}function Mh(o,p){return p>>>=0,o=Oe(o>>>0),p=Oe(p),Me(o[p])}function Ph(o){9<(o>>>=0)&&(it[o+1]+=1)}function Uh(){return Me([])}function Wh(o){o=Oe(o>>>0);for(var p=Array(o.length),m=0;m<o.length;m++)p[m]=o[m];return Me(p)}function Lh(o){return Me(_r(o>>>0))}function qh(){return Me({})}function Vh(o){for(var p=Oe(o>>>=0);p.length;){var m=p.pop();p.pop()(m)}ii(o)}function jh(o,p,m){p>>>=0,m>>>=0,o=Oe(o>>>0),p=Oe(p),m=Oe(m),o[p]=m}function Gh(o,p){return p>>>=0,o=(o=hr(o>>>0,"_emval_take_value")).readValueFromPointer(p),Me(o)}function Hh(o,p){o=-9007199254740992>o||9007199254740992<o?NaN:Number(o),p>>>=0,o=new Date(1e3*o),N()[p>>>2>>>0]=o.getUTCSeconds(),N()[p+4>>>2>>>0]=o.getUTCMinutes(),N()[p+8>>>2>>>0]=o.getUTCHours(),N()[p+12>>>2>>>0]=o.getUTCDate(),N()[p+16>>>2>>>0]=o.getUTCMonth(),N()[p+20>>>2>>>0]=o.getUTCFullYear()-1900,N()[p+24>>>2>>>0]=o.getUTCDay(),o=(o.getTime()-Date.UTC(o.getUTCFullYear(),0,1,0,0,0,0))/864e5|0,N()[p+28>>>2>>>0]=o}var Za=o=>o%4==0&&(o%100!=0||o%400==0),Qa=[0,31,60,91,121,152,182,213,244,274,305,335],Xa=[0,31,59,90,120,151,181,212,243,273,304,334];function Fh(o,p){o=-9007199254740992>o||9007199254740992<o?NaN:Number(o),p>>>=0,o=new Date(1e3*o),N()[p>>>2>>>0]=o.getSeconds(),N()[p+4>>>2>>>0]=o.getMinutes(),N()[p+8>>>2>>>0]=o.getHours(),N()[p+12>>>2>>>0]=o.getDate(),N()[p+16>>>2>>>0]=o.getMonth(),N()[p+20>>>2>>>0]=o.getFullYear()-1900,N()[p+24>>>2>>>0]=o.getDay();var m=(Za(o.getFullYear())?Qa:Xa)[o.getMonth()]+o.getDate()-1|0;N()[p+28>>>2>>>0]=m,N()[p+36>>>2>>>0]=-60*o.getTimezoneOffset(),m=new Date(o.getFullYear(),6,1).getTimezoneOffset();var _=new Date(o.getFullYear(),0,1).getTimezoneOffset();o=0|(m!=_&&o.getTimezoneOffset()==Math.min(_,m)),N()[p+32>>>2>>>0]=o}function Kh(o){o>>>=0;var p=new Date(N()[o+20>>>2>>>0]+1900,N()[o+16>>>2>>>0],N()[o+12>>>2>>>0],N()[o+8>>>2>>>0],N()[o+4>>>2>>>0],N()[o>>>2>>>0],0),m=N()[o+32>>>2>>>0],_=p.getTimezoneOffset(),v=new Date(p.getFullYear(),6,1).getTimezoneOffset(),k=new Date(p.getFullYear(),0,1).getTimezoneOffset(),B=Math.min(k,v);return 0>m?N()[o+32>>>2>>>0]=+(v!=k&&B==_):0<m!=(B==_)&&(v=Math.max(k,v),p.setTime(p.getTime()+6e4*((0<m?B:v)-_))),N()[o+24>>>2>>>0]=p.getDay(),m=(Za(p.getFullYear())?Qa:Xa)[p.getMonth()]+p.getDate()-1|0,N()[o+28>>>2>>>0]=m,N()[o>>>2>>>0]=p.getSeconds(),N()[o+4>>>2>>>0]=p.getMinutes(),N()[o+8>>>2>>>0]=p.getHours(),N()[o+12>>>2>>>0]=p.getDate(),N()[o+16>>>2>>>0]=p.getMonth(),N()[o+20>>>2>>>0]=p.getYear(),o=p.getTime(),BigInt(isNaN(o)?-1:o/1e3)}function Ya(o,p,m,_,v,k,B){return l?be(16,1,o,p,m,_,v,k,B):-52}function Ja(o,p,m,_,v,k){if(l)return be(17,1,o,p,m,_,v,k)}var Ft={},Zh=()=>performance.timeOrigin+performance.now();function es(o,p){if(l)return be(18,1,o,p);if(Ft[o]&&(clearTimeout(Ft[o].id),delete Ft[o]),!p)return 0;var m=setTimeout(()=>{delete Ft[o],ai(()=>gs(o,performance.timeOrigin+performance.now()))},p);return Ft[o]={id:m,qc:p},0}function Qh(o,p,m,_){o>>>=0,p>>>=0,m>>>=0,_>>>=0;var v=new Date().getFullYear(),k=new Date(v,0,1).getTimezoneOffset();v=new Date(v,6,1).getTimezoneOffset();var B=Math.max(k,v);me()[o>>>2>>>0]=60*B,N()[p>>>2>>>0]=+(k!=v),o=(p=M=>{var q=Math.abs(M);return`UTC${0<=M?"-":"+"}${String(Math.floor(q/60)).padStart(2,"0")}${String(q%60).padStart(2,"0")}`})(k),p=p(v),v<k?(Rt(o,m,17),Rt(p,_,17)):(Rt(o,_,17),Rt(p,m,17))}var Xh=()=>Date.now();function Yh(o,p,m){return 0<=o&&3>=o?(o===0?o=Date.now():o=performance.timeOrigin+performance.now(),V[m>>>0>>>3]=BigInt(Math.round(1e6*o)),0):28}var li=[],ts=(o,p)=>{li.length=0;for(var m;m=j()[o++>>>0];){var _=m!=105;p+=(_&=m!=112)&&p%8?4:0,li.push(m==112?me()[p>>>2>>>0]:m==106?V[p>>>3]:m==105?N()[p>>>2>>>0]:ze()[p>>>3>>>0]),p+=_?8:4}return li};function Jh(o,p,m){return o>>>=0,p=ts(p>>>0,m>>>0),Zr[o](...p)}function em(o,p,m){return o>>>=0,p=ts(p>>>0,m>>>0),Zr[o](...p)}var tm=()=>{};function rm(o,p){return I(ve(o>>>0,p>>>0))}var im=()=>{throw ut+=1,"unwind"};function nm(){return 4294901760}var am=()=>navigator.hardwareConcurrency;function sm(){return ot("Cannot use emscripten_pc_get_function without -sUSE_OFFSET_CONVERTER"),0}function om(o){o>>>=0;var p=j().length;if(o<=p||4294901760<o)return!1;for(var m=1;4>=m;m*=2){var _=p*(1+.2/m);_=Math.min(_,o+100663296);e:{_=(Math.min(4294901760,65536*Math.ceil(Math.max(o,_)/65536))-E.buffer.byteLength+65535)/65536|0;try{E.grow(_),ce();var v=1;break e}catch{}v=void 0}if(v)return!0}return!1}var br=()=>(ot("Cannot use convertFrameToPC (needed by __builtin_return_address) without -sUSE_OFFSET_CONVERTER"),0),Kt={},rs=o=>{o.forEach(p=>{br()})};function um(){var o=Error().stack.toString().split(`
`);return o[0]=="Error"&&o.shift(),rs(o),Kt.Lb=br(),Kt.cc=o,Kt.Lb}function lm(o,p,m){if(o>>>=0,p>>>=0,Kt.Lb==o)var _=Kt.cc;else(_=Error().stack.toString().split(`
`))[0]=="Error"&&_.shift(),rs(_);for(var v=3;_[v]&&br()!=o;)++v;for(o=0;o<m&&_[o+v];++o)N()[p+4*o>>>2>>>0]=br();return o}var di,pi={},is=()=>{if(!di){var o,p={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:(typeof navigator=="object"&&navigator.languages&&navigator.languages[0]||"C").replace("-","_")+".UTF-8",_:"./this.program"};for(o in pi)pi[o]===void 0?delete p[o]:p[o]=pi[o];var m=[];for(o in p)m.push(`${o}=${p[o]}`);di=m}return di};function ns(o,p){if(l)return be(19,1,o,p);o>>>=0,p>>>=0;var m=0;return is().forEach((_,v)=>{var k=p+m;for(v=me()[o+4*v>>>2>>>0]=k,k=0;k<_.length;++k)P()[v++>>>0]=_.charCodeAt(k);P()[v>>>0]=0,m+=_.length+1}),0}function as(o,p){if(l)return be(20,1,o,p);o>>>=0,p>>>=0;var m=is();me()[o>>>2>>>0]=m.length;var _=0;return m.forEach(v=>_+=v.length+1),me()[p>>>2>>>0]=_,0}function ss(o){return l?be(21,1,o):52}function os(o,p,m,_){return l?be(22,1,o,p,m,_):52}function us(o,p,m,_){return l?be(23,1,o,p,m,_):70}var dm=[null,[],[]];function ls(o,p,m,_){if(l)return be(24,1,o,p,m,_);p>>>=0,m>>>=0,_>>>=0;for(var v=0,k=0;k<m;k++){var B=me()[p>>>2>>>0],M=me()[p+4>>>2>>>0];p+=8;for(var q=0;q<M;q++){var K=j()[B+q>>>0],ae=dm[o];K===0||K===10?((o===1?T:I)(Ta(ae)),ae.length=0):ae.push(K)}v+=M}return me()[_>>>2>>>0]=v,0}l||(function(){for(var o=i.numThreads-1;o--;)wa();Xr.unshift(()=>{bt++,(function(p){l?p():Promise.all(lt.map(ba)).then(p)})(()=>pa())})})();for(var ds=Array(256),wr=0;256>wr;++wr)ds[wr]=String.fromCharCode(wr);Ua=ds,dt=i.BindingError=class extends Error{constructor(o){super(o),this.name="BindingError"}},i.InternalError=class extends Error{constructor(o){super(o),this.name="InternalError"}},it.push(0,1,void 0,1,null,1,!0,1,!1,1),i.count_emval_handles=()=>it.length/2-5-ri.length;var Y,pm=[Yr,ma,$a,Sa,Ia,Ea,Ca,za,Aa,Oa,Ba,Ra,Da,Na,Ma,Pa,Ya,Ja,es,ns,as,ss,os,us,ls];(async function(){function o(_,v){return Y=_.exports,Y=(function(){var k=Y,B={};for(let[M,q]of Object.entries(k))B[M]=typeof q=="function"?(...K)=>{gr.push(M);try{return q(...K)}finally{ne||(gr.pop(),Je&&ft===1&&gr.length===0&&(ft=0,ut+=1,mr($s),typeof Fibers<"u"&&Fibers.rc()))}}:q;return B})(),Y=(function(){var k=Y,B=q=>K=>q(K)>>>0,M=q=>()=>q()>>>0;return(k=Object.assign({},k)).Da=B(k.Da),k.fb=M(k.fb),k.hb=B(k.hb),k.tb=B(k.tb),k.ub=M(k.ub),k.__cxa_get_exception_ptr=B(k.__cxa_get_exception_ptr),k})(),ga.push(Y.ib),C=v,pa(),Y}bt++;var p=fa();if(i.instantiateWasm)return new Promise(_=>{i.instantiateWasm(p,(v,k)=>{o(v,k),_(v.exports)})});if(l)return new Promise(_=>{_t=v=>{var k=new WebAssembly.Instance(v,fa());_(o(k,v))}});jt??(jt=i.locateFile?i.locateFile?i.locateFile("ort-wasm-simd-threaded.jsep.wasm",$):$+"ort-wasm-simd-threaded.jsep.wasm":new URL("/image-shot-video-generator/preview/assets/ort-wasm-simd-threaded.jsep-B0T3yYHD.wasm",import.meta.url).href);try{var m=await(async function(_){var v=jt;if(!ee&&typeof WebAssembly.instantiateStreaming=="function"&&!D(v))try{var k=fetch(v,{credentials:"same-origin"});return await WebAssembly.instantiateStreaming(k,_)}catch(B){I(`wasm streaming compile failed: ${B}`),I("falling back to ArrayBuffer instantiation")}return(async function(B,M){try{var q=await(async function(K){if(!ee)try{var ae=await g(K);return new Uint8Array(ae)}catch{}if(K==jt&&ee)K=new Uint8Array(ee);else{if(!y)throw"both async and sync fetching of the wasm failed";K=y(K)}return K})(B);return await WebAssembly.instantiate(q,M)}catch(K){I(`failed to asynchronously prepare wasm: ${K}`),ot(K)}})(v,_)})(p);return o(m.instance,m.module)}catch(_){return a(_),Promise.reject(_)}})();var ps=o=>(ps=Y.Da)(o),fs=()=>(fs=Y.Ea)();i._OrtInit=(o,p)=>(i._OrtInit=Y.Fa)(o,p),i._OrtGetLastError=(o,p)=>(i._OrtGetLastError=Y.Ga)(o,p),i._OrtCreateSessionOptions=(o,p,m,_,v,k,B,M,q,K)=>(i._OrtCreateSessionOptions=Y.Ha)(o,p,m,_,v,k,B,M,q,K),i._OrtAppendExecutionProvider=(o,p,m,_,v)=>(i._OrtAppendExecutionProvider=Y.Ia)(o,p,m,_,v),i._OrtAddFreeDimensionOverride=(o,p,m)=>(i._OrtAddFreeDimensionOverride=Y.Ja)(o,p,m),i._OrtAddSessionConfigEntry=(o,p,m)=>(i._OrtAddSessionConfigEntry=Y.Ka)(o,p,m),i._OrtReleaseSessionOptions=o=>(i._OrtReleaseSessionOptions=Y.La)(o),i._OrtCreateSession=(o,p,m)=>(i._OrtCreateSession=Y.Ma)(o,p,m),i._OrtReleaseSession=o=>(i._OrtReleaseSession=Y.Na)(o),i._OrtGetInputOutputCount=(o,p,m)=>(i._OrtGetInputOutputCount=Y.Oa)(o,p,m),i._OrtGetInputOutputMetadata=(o,p,m,_)=>(i._OrtGetInputOutputMetadata=Y.Pa)(o,p,m,_),i._OrtFree=o=>(i._OrtFree=Y.Qa)(o),i._OrtCreateTensor=(o,p,m,_,v,k)=>(i._OrtCreateTensor=Y.Ra)(o,p,m,_,v,k),i._OrtGetTensorData=(o,p,m,_,v)=>(i._OrtGetTensorData=Y.Sa)(o,p,m,_,v),i._OrtReleaseTensor=o=>(i._OrtReleaseTensor=Y.Ta)(o),i._OrtCreateRunOptions=(o,p,m,_)=>(i._OrtCreateRunOptions=Y.Ua)(o,p,m,_),i._OrtAddRunConfigEntry=(o,p,m)=>(i._OrtAddRunConfigEntry=Y.Va)(o,p,m),i._OrtReleaseRunOptions=o=>(i._OrtReleaseRunOptions=Y.Wa)(o),i._OrtCreateBinding=o=>(i._OrtCreateBinding=Y.Xa)(o),i._OrtBindInput=(o,p,m)=>(i._OrtBindInput=Y.Ya)(o,p,m),i._OrtBindOutput=(o,p,m,_)=>(i._OrtBindOutput=Y.Za)(o,p,m,_),i._OrtClearBoundOutputs=o=>(i._OrtClearBoundOutputs=Y._a)(o),i._OrtReleaseBinding=o=>(i._OrtReleaseBinding=Y.$a)(o),i._OrtRunWithBinding=(o,p,m,_,v)=>(i._OrtRunWithBinding=Y.ab)(o,p,m,_,v),i._OrtRun=(o,p,m,_,v,k,B,M)=>(i._OrtRun=Y.bb)(o,p,m,_,v,k,B,M),i._OrtEndProfiling=o=>(i._OrtEndProfiling=Y.cb)(o),i._JsepOutput=(o,p,m)=>(i._JsepOutput=Y.db)(o,p,m),i._JsepGetNodeName=o=>(i._JsepGetNodeName=Y.eb)(o);var $r=()=>($r=Y.fb)(),et=i._free=o=>(et=i._free=Y.gb)(o),vr=i._malloc=o=>(vr=i._malloc=Y.hb)(o),fi=(o,p,m,_,v,k)=>(fi=Y.kb)(o,p,m,_,v,k),cs=()=>(cs=Y.lb)(),hs=(o,p,m,_,v)=>(hs=Y.mb)(o,p,m,_,v),ms=o=>(ms=Y.nb)(o),ci=o=>(ci=Y.ob)(o),gs=(o,p)=>(gs=Y.pb)(o,p),ys=()=>(ys=Y.qb)(),_s=(o,p)=>(_s=Y.rb)(o,p),xr=o=>(xr=Y.sb)(o),hi=o=>(hi=Y.tb)(o),mi=()=>(mi=Y.ub)(),bs=i.dynCall_ii=(o,p)=>(bs=i.dynCall_ii=Y.vb)(o,p),ws=o=>(ws=Y.wb)(o),$s=()=>($s=Y.xb)(),vs=o=>(vs=Y.yb)(o),xs=()=>(xs=Y.zb)();return i.stackSave=()=>mi(),i.stackRestore=o=>xr(o),i.stackAlloc=o=>hi(o),i.setValue=function(o,p,m="i8"){switch(m.endsWith("*")&&(m="*"),m){case"i1":case"i8":P()[o>>>0]=p;break;case"i16":se()[o>>>1>>>0]=p;break;case"i32":N()[o>>>2>>>0]=p;break;case"i64":V[o>>>3]=BigInt(p);break;case"float":Ne()[o>>>2>>>0]=p;break;case"double":ze()[o>>>3>>>0]=p;break;case"*":me()[o>>>2>>>0]=p;break;default:ot(`invalid type for setValue: ${m}`)}},i.getValue=function(o,p="i8"){switch(p.endsWith("*")&&(p="*"),p){case"i1":case"i8":return P()[o>>>0];case"i16":return se()[o>>>1>>>0];case"i32":return N()[o>>>2>>>0];case"i64":return V[o>>>3];case"float":return Ne()[o>>>2>>>0];case"double":return ze()[o>>>3>>>0];case"*":return me()[o>>>2>>>0];default:ot(`invalid type for getValue: ${p}`)}},i.UTF8ToString=ve,i.stringToUTF8=Rt,i.lengthBytesUTF8=ka,(function o(){if(0<bt)Gt=o;else if(l)n(i),Xe();else{for(;0<Xr.length;)Xr.shift()(i);0<bt?Gt=o:(i.calledRun=!0,ne||(Xe(),n(i)))}})(),i.PTR_SIZE=4,s}),Od=xi,Cs=(t=(e=globalThis.self)==null?void 0:e.name)==null?void 0:t.startsWith("em-pthread"),Cs&&xi()}),Ti,bn,zs,Be,Bd,Sr,As,Os,Si,Bs,Ii,Rd,ki,Dd,Un=U(()=>{Pn(),Ti=typeof location>"u"?void 0:location.origin,bn=import.meta.url>"file:"&&import.meta.url<"file;",zs=()=>{{if(bn){let e=URL;return new URL(new e("ort.bundle.min.mjs",import.meta.url).href,Ti).href}return import.meta.url}},Be=zs(),Bd=()=>{if(Be&&!Be.startsWith("blob:"))return Be.substring(0,Be.lastIndexOf("/")+1)},Sr=(e,t)=>{try{let r=t??Be;return(r?new URL(e,r):new URL(e)).origin===Ti}catch{return!1}},As=(e,t)=>{let r=t??Be;try{return(r?new URL(e,r):new URL(e)).href}catch{return}},Os=(e,t)=>`${t??"./"}${e}`,Si=async e=>{let t=await(await fetch(e,{credentials:"same-origin"})).blob();return URL.createObjectURL(t)},Bs=async e=>(await import(e)).default,Ii=(Qm(),dr(Cd)).default,Rd=async()=>{if(!Be)throw new Error("Failed to load proxy worker: cannot determine the script source URL.");if(Sr(Be))return[void 0,Ii()];let e=await Si(Be);return[e,Ii(e)]},ki=(Xm(),dr(Ad)).default,Dd=async(e,t,r)=>{if(!e&&!t&&ki&&Be&&Sr(Be))return[void 0,ki];{let n="ort-wasm-simd-threaded.jsep.mjs",a=e??As(n,t),i=r&&a&&!Sr(a,t),s=i?await Si(a):a??Os(n,t);return[i?s:void 0,await Bs(s)]}}}),Ei,Ir,Qt,Ci,Rs,Ds,Ns,Wn,ye,Ot=U(()=>{Un(),Ir=!1,Qt=!1,Ci=!1,Rs=()=>{if(typeof SharedArrayBuffer>"u")return!1;try{return typeof MessageChannel<"u"&&new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)),WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,5,4,1,3,1,1,10,11,1,9,0,65,0,254,16,2,0,26,11]))}catch{return!1}},Ds=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,30,1,28,0,65,0,253,15,253,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,186,1,26,11]))}catch{return!1}},Ns=()=>{try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,19,1,17,0,65,1,253,15,65,2,253,15,65,3,253,15,253,147,2,11]))}catch{return!1}},Wn=async e=>{if(Ir)return Promise.resolve();if(Qt)throw new Error("multiple calls to 'initializeWebAssembly()' detected.");if(Ci)throw new Error("previous call to 'initializeWebAssembly()' failed.");Qt=!0;let t=e.initTimeout,r=e.numThreads;if(e.simd!==!1){if(e.simd==="relaxed"){if(!Ns())throw new Error("Relaxed WebAssembly SIMD is not supported in the current environment.")}else if(!Ds())throw new Error("WebAssembly SIMD is not supported in the current environment.")}let n=Rs();r>1&&!n&&(typeof self<"u"&&!self.crossOriginIsolated&&console.warn("env.wasm.numThreads is set to "+r+", but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info."),console.warn("WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading."),e.numThreads=r=1);let a=e.wasmPaths,i=typeof a=="string"?a:void 0,s=a==null?void 0:a.mjs,u=(s==null?void 0:s.href)??s,d=a==null?void 0:a.wasm,l=(d==null?void 0:d.href)??d,f=e.wasmBinary,[c,h]=await Dd(u,i,r>1),g=!1,y=[];if(t>0&&y.push(new Promise(b=>{setTimeout(()=>{g=!0,b()},t)})),y.push(new Promise((b,x)=>{let $={numThreads:r};if(f)$.wasmBinary=f;else if(l||i)$.locateFile=w=>l??i+w;else if(u&&u.indexOf("blob:")!==0)$.locateFile=w=>new URL(w,u).href;else if(c){let w=Bd();w&&($.locateFile=S=>w+S)}h($).then(w=>{Qt=!1,Ir=!0,Ei=w,b(),c&&URL.revokeObjectURL(c)},w=>{Qt=!1,Ci=!0,x(w)})})),await Promise.race(y),g)throw new Error(`WebAssembly backend initializing failed due to timeout: ${t}ms`)},ye=()=>{if(Ir&&Ei)return Ei;throw new Error("WebAssembly is not initialized yet.")}}),He,qr,he,Ln=U(()=>{Ot(),He=(e,t)=>{let r=ye(),n=r.lengthBytesUTF8(e)+1,a=r._malloc(n);return r.stringToUTF8(e,a,n),t.push(a),a},qr=(e,t,r,n)=>{if(typeof e=="object"&&e!==null){if(r.has(e))throw new Error("Circular reference in options");r.add(e)}Object.entries(e).forEach(([a,i])=>{let s=t?t+a:a;if(typeof i=="object")qr(i,s+".",r,n);else if(typeof i=="string"||typeof i=="number")n(s,i.toString());else if(typeof i=="boolean")n(s,i?"1":"0");else throw new Error(`Can't handle extra config type: ${typeof i}`)})},he=e=>{let t=ye(),r=t.stackSave();try{let n=t.PTR_SIZE,a=t.stackAlloc(2*n);t._OrtGetLastError(a,a+n);let i=Number(t.getValue(a,n===4?"i32":"i64")),s=t.getValue(a+n,"*"),u=s?t.UTF8ToString(s):"";throw new Error(`${e} ERROR_CODE: ${i}, ERROR_MESSAGE: ${u}`)}finally{t.stackRestore(r)}}}),Nd,Ym=U(()=>{Ot(),Ln(),Nd=e=>{let t=ye(),r=0,n=[],a=e||{};try{if((e==null?void 0:e.logSeverityLevel)===void 0)a.logSeverityLevel=2;else if(typeof e.logSeverityLevel!="number"||!Number.isInteger(e.logSeverityLevel)||e.logSeverityLevel<0||e.logSeverityLevel>4)throw new Error(`log serverity level is not valid: ${e.logSeverityLevel}`);if((e==null?void 0:e.logVerbosityLevel)===void 0)a.logVerbosityLevel=0;else if(typeof e.logVerbosityLevel!="number"||!Number.isInteger(e.logVerbosityLevel))throw new Error(`log verbosity level is not valid: ${e.logVerbosityLevel}`);(e==null?void 0:e.terminate)===void 0&&(a.terminate=!1);let i=0;return(e==null?void 0:e.tag)!==void 0&&(i=He(e.tag,n)),r=t._OrtCreateRunOptions(a.logSeverityLevel,a.logVerbosityLevel,!!a.terminate,i),r===0&&he("Can't create run options."),(e==null?void 0:e.extra)!==void 0&&qr(e.extra,"",new WeakSet,(s,u)=>{let d=He(s,n),l=He(u,n);t._OrtAddRunConfigEntry(r,d,l)!==0&&he(`Can't set a run config entry: ${s} - ${u}.`)}),[r,n]}catch(i){throw r!==0&&t._OrtReleaseRunOptions(r),n.forEach(s=>t._free(s)),i}}}),Ms,Ps,Us,Xt,Ws,Md,Jm=U(()=>{Ot(),Ln(),Ms=e=>{switch(e){case"disabled":return 0;case"basic":return 1;case"extended":return 2;case"all":return 99;default:throw new Error(`unsupported graph optimization level: ${e}`)}},Ps=e=>{switch(e){case"sequential":return 0;case"parallel":return 1;default:throw new Error(`unsupported execution mode: ${e}`)}},Us=e=>{e.extra||(e.extra={}),e.extra.session||(e.extra.session={});let t=e.extra.session;t.use_ort_model_bytes_directly||(t.use_ort_model_bytes_directly="1"),e.executionProviders&&e.executionProviders.some(r=>(typeof r=="string"?r:r.name)==="webgpu")&&(e.enableMemPattern=!1)},Xt=(e,t,r,n)=>{let a=He(t,n),i=He(r,n);ye()._OrtAddSessionConfigEntry(e,a,i)!==0&&he(`Can't set a session config entry: ${t} - ${r}.`)},Ws=async(e,t,r)=>{for(let n of t){let a=typeof n=="string"?n:n.name,i=[];switch(a){case"webnn":if(a="WEBNN",typeof n!="string"){let f=n==null?void 0:n.deviceType;f&&Xt(e,"deviceType",f,r)}break;case"webgpu":if(a="JS",typeof n!="string"){let f=n;if(f!=null&&f.preferredLayout){if(f.preferredLayout!=="NCHW"&&f.preferredLayout!=="NHWC")throw new Error(`preferredLayout must be either 'NCHW' or 'NHWC': ${f.preferredLayout}`);Xt(e,"preferredLayout",f.preferredLayout,r)}}break;case"wasm":case"cpu":continue;default:throw new Error(`not supported execution provider: ${a}`)}let s=He(a,r),u=i.length,d=0,l=0;if(u>0){d=ye()._malloc(u*ye().PTR_SIZE),r.push(d),l=ye()._malloc(u*ye().PTR_SIZE),r.push(l);for(let f=0;f<u;f++)ye().setValue(d+f*ye().PTR_SIZE,i[f][0],"*"),ye().setValue(l+f*ye().PTR_SIZE,i[f][1],"*")}await ye()._OrtAppendExecutionProvider(e,s,d,l,u)!==0&&he(`Can't append execution provider: ${a}.`)}},Md=async e=>{let t=ye(),r=0,n=[],a=e||{};Us(a);try{let i=Ms(a.graphOptimizationLevel??"all"),s=Ps(a.executionMode??"sequential"),u=typeof a.logId=="string"?He(a.logId,n):0,d=a.logSeverityLevel??2;if(!Number.isInteger(d)||d<0||d>4)throw new Error(`log serverity level is not valid: ${d}`);let l=a.logVerbosityLevel??0;if(!Number.isInteger(l)||l<0||l>4)throw new Error(`log verbosity level is not valid: ${l}`);let f=typeof a.optimizedModelFilePath=="string"?He(a.optimizedModelFilePath,n):0;if(r=t._OrtCreateSessionOptions(i,!!a.enableCpuMemArena,!!a.enableMemPattern,s,!!a.enableProfiling,0,u,d,l,f),r===0&&he("Can't create session options."),a.executionProviders&&await Ws(r,a.executionProviders,n),a.enableGraphCapture!==void 0){if(typeof a.enableGraphCapture!="boolean")throw new Error(`enableGraphCapture must be a boolean value: ${a.enableGraphCapture}`);Xt(r,"enableGraphCapture",a.enableGraphCapture.toString(),n)}if(a.freeDimensionOverrides)for(let[c,h]of Object.entries(a.freeDimensionOverrides)){if(typeof c!="string")throw new Error(`free dimension override name must be a string: ${c}`);if(typeof h!="number"||!Number.isInteger(h)||h<0)throw new Error(`free dimension override value must be a non-negative integer: ${h}`);let g=He(c,n);t._OrtAddFreeDimensionOverride(r,g,h)!==0&&he(`Can't set a free dimension override: ${c} - ${h}.`)}return a.extra!==void 0&&qr(a.extra,"",new WeakSet,(c,h)=>{Xt(r,c,h,n)}),[r,n]}catch(i){throw r!==0&&t._OrtReleaseSessionOptions(r)!==0&&he("Can't release session options."),n.forEach(s=>t._free(s)),i}}}),Pt,at,kt,qn,Vr,Vn,jn,wn,J=U(()=>{Pt=e=>{switch(e){case"int8":return 3;case"uint8":return 2;case"bool":return 9;case"int16":return 5;case"uint16":return 4;case"int32":return 6;case"uint32":return 12;case"float16":return 10;case"float32":return 1;case"float64":return 11;case"string":return 8;case"int64":return 7;case"uint64":return 13;case"int4":return 22;case"uint4":return 21;default:throw new Error(`unsupported data type: ${e}`)}},at=e=>{switch(e){case 3:return"int8";case 2:return"uint8";case 9:return"bool";case 5:return"int16";case 4:return"uint16";case 6:return"int32";case 12:return"uint32";case 10:return"float16";case 1:return"float32";case 11:return"float64";case 8:return"string";case 7:return"int64";case 13:return"uint64";case 22:return"int4";case 21:return"uint4";default:throw new Error(`unsupported data type: ${e}`)}},kt=(e,t)=>{let r=[-1,4,1,1,2,2,4,8,-1,1,2,8,4,8,-1,-1,-1,-1,-1,-1,-1,.5,.5][e],n=typeof t=="number"?t:t.reduce((a,i)=>a*i,1);return r>0?Math.ceil(n*r):void 0},qn=e=>{switch(e){case"float16":return typeof Float16Array<"u"&&Float16Array.from?Float16Array:Uint16Array;case"float32":return Float32Array;case"uint8":return Uint8Array;case"int8":return Int8Array;case"uint16":return Uint16Array;case"int16":return Int16Array;case"int32":return Int32Array;case"bool":return Uint8Array;case"float64":return Float64Array;case"uint32":return Uint32Array;case"int64":return BigInt64Array;case"uint64":return BigUint64Array;default:throw new Error(`unsupported type: ${e}`)}},Vr=e=>{switch(e){case"verbose":return 0;case"info":return 1;case"warning":return 2;case"error":return 3;case"fatal":return 4;default:throw new Error(`unsupported logging level: ${e}`)}},Vn=e=>e==="float32"||e==="float16"||e==="int32"||e==="int64"||e==="uint32"||e==="uint8"||e==="bool"||e==="uint4"||e==="int4",jn=e=>e==="float32"||e==="float16"||e==="int32"||e==="int64"||e==="uint32"||e==="uint64"||e==="int8"||e==="uint8"||e==="bool"||e==="uint4"||e==="int4",wn=e=>{switch(e){case"none":return 0;case"cpu":return 1;case"cpu-pinned":return 2;case"texture":return 3;case"gpu-buffer":return 4;case"ml-tensor":return 5;default:throw new Error(`unsupported data location: ${e}`)}}}),Gn,Pd=U(()=>{Pn(),Gn=async e=>{if(typeof e=="string"){let t=await fetch(e);if(!t.ok)throw new Error(`failed to load external data file: ${e}`);let r=t.headers.get("Content-Length"),n=r?parseInt(r,10):0;if(n<1073741824)return new Uint8Array(await t.arrayBuffer());{if(!t.body)throw new Error(`failed to load external data file: ${e}, no response body.`);let a=t.body.getReader(),i;try{i=new ArrayBuffer(n)}catch(u){if(u instanceof RangeError){let d=Math.ceil(n/65536);i=new WebAssembly.Memory({initial:d,maximum:d}).buffer}else throw u}let s=0;for(;;){let{done:u,value:d}=await a.read();if(u)break;let l=d.byteLength;new Uint8Array(i,s,l).set(d),s+=l}return new Uint8Array(i,0,n)}}else return e instanceof Blob?new Uint8Array(await e.arrayBuffer()):e instanceof Uint8Array?e:new Uint8Array(e)}}),Ls,qs,Vs,js,Hn,Gs,ue,st=U(()=>{J(),Ls=["V","I","W","E","F"],qs=(e,t)=>{console.log(`[${Ls[e]},${new Date().toISOString()}]${t}`)},Hn=(e,t)=>{Vs=e,js=t},Gs=(e,t)=>{let r=Vr(e),n=Vr(Vs);r>=n&&qs(r,typeof t=="function"?t():t)},ue=(...e)=>{js&&Gs(...e)}}),Hs,Lt,z,jr,Ud,Wd,Ld,re=U(()=>{Hs=class{static calcMatMulShape(e,t){return e[1]!==t[0]?void 0:[e[0],t[1]]}},Lt=class{static calcShape(e,t,r=!1){let n=e.length,a=t.length;if(n===0)return t;if(a===0)return e;let i=Math.max(e.length,t.length),s=new Array(i);if(r){if(n<2||a<2)return;let u=Hs.calcMatMulShape([e[n-2],e[n-1]],[t[a-2],t[a-1]]);if(u===void 0)return;[s[i-2],s[i-1]]=u}for(let u=r?3:1;u<=i;u++){let d=n-u<0?1:e[n-u],l=a-u<0?1:t[a-u];if(d!==l&&d>1&&l>1)return;let f=Math.max(d,l);if(d&&l)s[i-u]=Math.max(d,l);else{if(f>1)return;s[i-u]=0}}return s}static isValidBroadcast(e,t){let r=e.length,n=t.length;if(r>n)return!1;for(let a=1;a<=r;a++)if(e[r-a]!==1&&e[r-a]!==t[n-a])return!1;return!0}},z=class Wr{static size(t){return Wr.getSizeFromDimensionRange(t,0,t.length)}static convertShape(t,r=4){let n=t.length;if(n===0)return[];let a=new Array(n),i=n-1;for(;i>=0;){if(t[i]%r===0){a[i]=t[i]/r;break}if(r%t[i]!==0)throw new Error("cannot convert shape");a[i]=1,r/=t[i],i--}for(i--;i>=0;i--)a[i]=t[i];return a}static sizeFromDimension(t,r){if(r<0||r>t.length)throw new Error(`invalid dimension of ${r} for sizeFromDimension as Tensor has ${t.length} dimensions.`);return Wr.getSizeFromDimensionRange(t,r,t.length)}static sizeToDimension(t,r){if(r<0||r>t.length)throw new Error(`invalid dimension of ${r} for sizeToDimension as Tensor has ${t.length} dimensions.`);return Wr.getSizeFromDimensionRange(t,0,r)}static getSizeFromDimensionRange(t,r,n){let a=1;for(let i=r;i<n;i++){if(t[i]<0)throw new Error("cannot get valid size from specified dimension range. Most likely the range contains negative values in them.");a*=Number(t[i])}return a}static computeStrides(t){let r=t.length;if(r===0)return[];if(r===1)return[1];let n=new Array(r);n[r-1]=1,n[r-2]=t[r-1];for(let a=r-3;a>=0;--a)n[a]=n[a+1]*t[a+1];return n}static normalizeAxis(t,r){if(t<-r&&t>=r)throw new Error("unsupported axis for this operation.");return t<0?t+r:t}static normalizeAxes(t,r){return t.map(n=>this.normalizeAxis(n,r??t.length))}static sortBasedOnPerm(t,r){return r?r.map(n=>t[n]):t.slice().reverse()}static padShape(t,r){let n=t.length;return t.map((a,i)=>a+r[i]+r[i+n])}static areEqual(t,r){return t.length!==r.length?!1:t.every((n,a)=>n===r[a])}},jr=class sr{static adjustPoolAttributes(t,r,n,a,i,s){if(!t&&n.length!==r.length-2)throw new Error("length of specified kernel shapes should be 2 less than length of input dimensions");if(t)for(let u=0;u<r.length-2;u++)u>=n.length?n.push(r[u+2]):n[u]=r[u+2];for(let u=0;u<n.length;u++)if(u<a.length){if(a[u]<0)throw new Error("strides should be greater than or equal to 1")}else a.push(1);for(let u=0;u<n.length;u++)if(u<i.length){if(i[u]<0)throw new Error("dilations should be greater than or equal to 1")}else i.push(1);for(let u=0;u<n.length*2;u++)if(u<s.length){if(s[u]<0)throw new Error("pad should be greater than or equal to 1")}else s.push(0);for(let u=0;u<n.length;u++){if(n[u]<=0)throw new Error("kernel shapes need to be greater than 0");if(s[u]>=n[u]||s[u+n.length]>=n[u])throw new Error("pads should be smaller than kernel")}}static adjustPadsBasedOnAutoPad(t,r,n,a,i,s,u){if(u){if(i.length!==2*(t.length-2))throw new Error("length of pads should be twice the length of data dimensions");if(r.length!==t.length-2)throw new Error("length of strides should be the length of data dimensions");if(a.length!==t.length-2)throw new Error("length of kernel shapes should be the length of data dimensions");for(let d=0;d<t.length-2;d++)sr.adjustPadAndReturnShape(t[d+(s?1:2)],r[d],n[d],a[d],i,d,d+t.length-2,u)}}static computePoolOutputShape(t,r,n,a,i,s,u){if(r.length<=0)throw new Error("input shape must be of size greater than 0");let d=[r[0],r[1]];return sr.computeShapeHelper(t,r,d,n,a,i,s,u),d}static computeConvOutputShape(t,r,n,a,i,s,u){if(t.length<=0||r.length<=0)throw new Error("invalid input tensor dims or invalid filter tensor dims");let d=[t[0],r[0]];return sr.computeShapeHelper(!1,t,d,n,a,i,s,u),d}static computeShapeHelper(t,r,n,a,i,s,u,d){if(t)for(let l=0;l<r.length-2;l++)n.push(1);else for(let l=0;l<r.length-2;l++)n.push(sr.adjustPadAndReturnShape(r[l+2],a[l],i[l],s[l],u,l,l+r.length-2,d))}static adjustPadAndReturnShape(t,r,n,a,i,s,u,d){let l=n*(a-1)+1;if(d&&d!=="NOTSET")switch(d){case"VALID":return i[s]=0,i[u]=0,Math.floor((t-l)/r+1);case"SAME_LOWER":case"SAME_UPPER":if(n!==1)throw new Error("Dilation not supported for SAME_UPPER or SAME_LOWER");{let f=((t+r-1)/r-1)*r+a-t;return i[s]=Math.floor(d==="SAME_LOWER"?(f+1)/2:f/2),i[u]=f-i[s],Math.floor((t+f-a)/r+1)}default:throw new Error("Unsupported AutoPad type")}else return Math.floor((t+i[s]+i[u]-l)/r+1)}},Ud=class{static getShapeOfGemmResult(e,t,r,n,a){if(e.length!==2||r.length!==2)throw new Error("shape need to be of size 2");let i,s,u;t?(i=e[1],s=e[0]):(i=e[0],s=e[1]);let d=-1;if(n?(u=r[0],d=1):(u=r[1],d=0),r[d]!==s)throw new Error("dimension mismatch");if(i<=0||u<=0||s<=0)throw new Error("invalid shape specified");if(a&&!Lt.isValidBroadcast(a,[i,u]))throw new Error("gemm: invalid bias shape for broadcast");return[i,u,s]}},Wd=-34028234663852886e22,Ld=34028234663852886e22}),Fn,qd=U(()=>{J(),Fn=(e,t)=>new(qn(t))(e)}),$n,zi,Fs,Ai,Ks,Oi,Bi,Ri,Zs,Vd,eg=U(()=>{st(),$n=(e,t=!0)=>{if(e.byteLength%8!==0)throw new Error("Invalid Uint8Array length - must be a multiple of 8 (BigInt).");let r=e.byteLength/8,n=new BigInt64Array(e.buffer,e.byteOffset,r),a=new Int32Array(r);for(let i=0;i<r;i++){let s=n[i];if(s>2147483647n||s<-2147483648n)throw new Error(`Overflow occurred when converting BigInt to Int32 at index ${i}: ${s}`);a[i]=Number(s)}return t?new Uint8Array(a.buffer):a},zi=(e,t=!0)=>{if(e.byteLength%4!==0)throw new Error("Invalid Uint8Array length - must be a multiple of 4 (Int32).");let r=e.byteLength/4,n=new Int32Array(e.buffer,e.byteOffset,r),a=BigInt64Array.from(n,BigInt);return t?new Uint8Array(a.buffer):a},Fs=1,Ai=()=>Fs++,Ks=new Map([["float32",32],["float16",16],["int32",32],["uint32",32],["int64",64],["uint64",64],["int8",8],["uint8",8],["int4",4],["uint4",4]]),Oi=(e,t)=>{let r=Ks.get(e);if(!r)throw new Error("Unsupported data type.");return t.length>0?Math.ceil(t.reduce((n,a)=>n*a)*r/8):0},Bi=class{constructor(e){this.shouldConvertInt64toInt32=!1,this.isInt64ToInt32Converted=!1;let{sessionId:t,context:r,tensor:n,dataType:a,shape:i,shouldConvertInt64toInt32:s=!1}=e;this.sessionId=t,this.mlContext=r,this.mlTensor=n,this.dataType=a,this.tensorShape=i,this.shouldConvertInt64toInt32=s}get tensor(){return this.mlTensor}get type(){return this.dataType}get shape(){return this.tensorShape}get byteLength(){return Oi(this.dataType,this.tensorShape)}destroy(){ue("verbose",()=>"[WebNN] TensorWrapper.destroy"),this.mlTensor.destroy()}write(e){this.mlContext.writeTensor(this.mlTensor,e)}async read(e,t){if(e){let r=await this.mlContext.readTensor(this.mlTensor),n=zi(new Uint8Array(r));if(t){(t instanceof ArrayBuffer?new Uint8Array(t):new Uint8Array(t.buffer,t.byteOffset,t.byteLength)).set(n);return}else return n.buffer}else return t?this.mlContext.readTensor(this.mlTensor,t):this.mlContext.readTensor(this.mlTensor)}canReuseTensor(e,t,r){return this.mlContext===e&&this.dataType===t&&this.tensorShape.length===r.length&&this.tensorShape.every((n,a)=>n===r[a])}setIsInt64ToInt32Converted(e){this.isInt64ToInt32Converted=e}},Ri=class{constructor(e,t){this.tensorManager=e,this.wrapper=t}get tensorWrapper(){return this.wrapper}releaseTensor(){this.tensorWrapper&&(this.tensorManager.releaseTensor(this.tensorWrapper),this.wrapper=void 0)}async ensureTensor(e,t,r,n){let a=t,i=this.tensorManager.getMLContext(e),s=a==="int64"&&!i.opSupportLimits().input.dataTypes.includes("int64");if(s&&(a="int32",ue("verbose",()=>"[WebNN] TensorIdTracker.ensureTensor: convert dataType from int64 to int32")),this.wrapper){if(this.wrapper.canReuseTensor(i,a,r))return this.wrapper.tensor;if(n){if(this.wrapper.byteLength!==Oi(a,r))throw new Error("Unable to copy data to tensor with different size.");this.activeUpload=new Uint8Array(await this.wrapper.read())}this.tensorManager.releaseTensor(this.wrapper)}let u=typeof MLTensorUsage>"u"?void 0:MLTensorUsage.READ|MLTensorUsage.WRITE;return this.wrapper=await this.tensorManager.getCachedTensor(e,a,r,u,!0,!0,s),n&&this.activeUpload&&(this.wrapper.write(this.activeUpload),this.activeUpload=void 0),this.wrapper.tensor}upload(e){let t=e;if(this.wrapper)if(this.wrapper.shouldConvertInt64toInt32&&(t=$n(e,!0),this.wrapper.setIsInt64ToInt32Converted(!0)),t.byteLength===this.wrapper.byteLength){this.wrapper.write(t);return}else ue("verbose",()=>"Data size does not match tensor size. Releasing tensor."),this.releaseTensor();this.activeUpload?this.activeUpload.set(t):this.activeUpload=new Uint8Array(t)}async download(e){var t,r,n;if(this.activeUpload){let a=(t=this.wrapper)!=null&&t.isInt64ToInt32Converted?zi(this.activeUpload):this.activeUpload;if(e){e instanceof ArrayBuffer?new Uint8Array(e).set(a):new Uint8Array(e.buffer,e.byteOffset,e.byteLength).set(a);return}else return a.buffer}if(!this.wrapper)throw new Error("Tensor has not been created.");return e?this.wrapper.read((r=this.wrapper)==null?void 0:r.shouldConvertInt64toInt32,e):this.wrapper.read((n=this.wrapper)==null?void 0:n.shouldConvertInt64toInt32)}},Zs=class{constructor(e){this.backend=e,this.tensorTrackersById=new Map,this.freeTensors=[],this.externalTensors=new Set}getMLContext(e){let t=this.backend.getMLContext(e);if(!t)throw new Error("MLContext not found for session.");return t}reserveTensorId(){let e=Ai();return this.tensorTrackersById.set(e,new Ri(this)),e}releaseTensorId(e){let t=this.tensorTrackersById.get(e);t&&(this.tensorTrackersById.delete(e),t.tensorWrapper&&this.releaseTensor(t.tensorWrapper))}async ensureTensor(e,t,r,n,a){ue("verbose",()=>`[WebNN] TensorManager.ensureTensor {tensorId: ${t}, dataType: ${r}, shape: ${n}, copyOld: ${a}}`);let i=this.tensorTrackersById.get(t);if(!i)throw new Error("Tensor not found.");return i.ensureTensor(e,r,n,a)}upload(e,t){let r=this.tensorTrackersById.get(e);if(!r)throw new Error("Tensor not found.");r.upload(t)}async download(e,t){ue("verbose",()=>`[WebNN] TensorManager.download {tensorId: ${e}, dstBuffer: ${t==null?void 0:t.byteLength}}`);let r=this.tensorTrackersById.get(e);if(!r)throw new Error("Tensor not found.");return r.download(t)}releaseTensorsForSession(e){for(let t of this.freeTensors)t.sessionId===e&&t.destroy();this.freeTensors=this.freeTensors.filter(t=>t.sessionId!==e)}registerTensor(e,t,r,n){let a=this.getMLContext(e),i=Ai(),s=new Bi({sessionId:e,context:a,tensor:t,dataType:r,shape:n});return this.tensorTrackersById.set(i,new Ri(this,s)),this.externalTensors.add(s),i}async getCachedTensor(e,t,r,n,a,i,s=!1){let u=this.getMLContext(e);for(let[l,f]of this.freeTensors.entries())if(f.canReuseTensor(u,t,r)){ue("verbose",()=>`[WebNN] Reusing tensor {dataType: ${t}, shape: ${r}}`);let c=this.freeTensors.splice(l,1)[0];return c.sessionId=e,c}ue("verbose",()=>`[WebNN] MLContext.createTensor {dataType: ${t}, shape: ${r}}`);let d=await u.createTensor({dataType:t,shape:r,dimensions:r,usage:n,writable:a,readable:i});return new Bi({sessionId:e,context:u,tensor:d,dataType:t,shape:r,shouldConvertInt64toInt32:s})}releaseTensor(e){this.externalTensors.has(e)&&this.externalTensors.delete(e),this.freeTensors.push(e)}},Vd=(...e)=>new Zs(...e)}),kr,Qs,jd,tg=U(()=>{J(),Ot(),qd(),eg(),st(),kr=new Map([[1,"float32"],[10,"float16"],[6,"int32"],[12,"uint32"],[7,"int64"],[13,"uint64"],[22,"int4"],[21,"uint4"],[3,"int8"],[2,"uint8"],[9,"uint8"]]),Qs=(e,t)=>{if(e===t)return!0;if(e===void 0||t===void 0)return!1;let r=Object.keys(e).sort(),n=Object.keys(t).sort();return r.length===n.length&&r.every((a,i)=>a===n[i]&&e[a]===t[a])},jd=class{constructor(e){this.tensorManager=Vd(this),this.mlContextBySessionId=new Map,this.sessionIdsByMLContext=new Map,this.mlContextCache=[],this.sessionGraphInputs=new Map,this.temporaryGraphInputs=[],this.temporarySessionTensorIds=new Map,Hn(e.logLevel,!!e.debug)}get currentSessionId(){if(this.activeSessionId===void 0)throw new Error("No active session");return this.activeSessionId}onRunStart(e){ue("verbose",()=>`[WebNN] onRunStart {sessionId: ${e}}`),this.activeSessionId=e}onRunEnd(e){ue("verbose",()=>`[WebNN] onRunEnd {sessionId: ${e}}`);let t=this.temporarySessionTensorIds.get(e);if(t){for(let r of t)ue("verbose",()=>`[WebNN] releasing temporary tensor {tensorId: ${r}}`),this.tensorManager.releaseTensorId(r);this.temporarySessionTensorIds.delete(e),this.activeSessionId=void 0}}async createMLContext(e){if(e instanceof GPUDevice){let r=this.mlContextCache.findIndex(n=>n.gpuDevice===e);if(r!==-1)return this.mlContextCache[r].mlContext;{let n=await navigator.ml.createContext(e);return this.mlContextCache.push({gpuDevice:e,mlContext:n}),n}}else if(e===void 0){let r=this.mlContextCache.findIndex(n=>n.options===void 0&&n.gpuDevice===void 0);if(r!==-1)return this.mlContextCache[r].mlContext;{let n=await navigator.ml.createContext();return this.mlContextCache.push({mlContext:n}),n}}let t=this.mlContextCache.findIndex(r=>Qs(r.options,e));if(t!==-1)return this.mlContextCache[t].mlContext;{let r=await navigator.ml.createContext(e);return this.mlContextCache.push({options:e,mlContext:r}),r}}registerMLContext(e,t){this.mlContextBySessionId.set(e,t);let r=this.sessionIdsByMLContext.get(t);r||(r=new Set,this.sessionIdsByMLContext.set(t,r)),r.add(e),this.temporaryGraphInputs.length>0&&(this.sessionGraphInputs.set(e,this.temporaryGraphInputs),this.temporaryGraphInputs=[])}onReleaseSession(e){this.sessionGraphInputs.delete(e);let t=this.mlContextBySessionId.get(e);if(!t)return;this.tensorManager.releaseTensorsForSession(e),this.mlContextBySessionId.delete(e);let r=this.sessionIdsByMLContext.get(t);if(r.delete(e),r.size===0){this.sessionIdsByMLContext.delete(t);let n=this.mlContextCache.findIndex(a=>a.mlContext===t);n!==-1&&this.mlContextCache.splice(n,1)}}getMLContext(e){return this.mlContextBySessionId.get(e)}reserveTensorId(){return this.tensorManager.reserveTensorId()}releaseTensorId(e){ue("verbose",()=>`[WebNN] releaseTensorId {tensorId: ${e}}`),this.tensorManager.releaseTensorId(e)}async ensureTensor(e,t,r,n,a){let i=kr.get(r);if(!i)throw new Error(`Unsupported ONNX data type: ${r}`);return this.tensorManager.ensureTensor(e??this.currentSessionId,t,i,n,a)}async createTemporaryTensor(e,t,r){ue("verbose",()=>`[WebNN] createTemporaryTensor {onnxDataType: ${t}, shape: ${r}}`);let n=kr.get(t);if(!n)throw new Error(`Unsupported ONNX data type: ${t}`);let a=this.tensorManager.reserveTensorId();await this.tensorManager.ensureTensor(e,a,n,r,!1);let i=this.temporarySessionTensorIds.get(e);return i?i.push(a):this.temporarySessionTensorIds.set(e,[a]),a}uploadTensor(e,t){if(!ye().shouldTransferToMLTensor)throw new Error("Trying to upload to a MLTensor while shouldTransferToMLTensor is false");ue("verbose",()=>`[WebNN] uploadTensor {tensorId: ${e}, data: ${t.byteLength}}`),this.tensorManager.upload(e,t)}async downloadTensor(e,t){return this.tensorManager.download(e,t)}createMLTensorDownloader(e,t){return async()=>{let r=await this.tensorManager.download(e);return Fn(r,t)}}registerMLTensor(e,t,r,n){let a=kr.get(r);if(!a)throw new Error(`Unsupported ONNX data type: ${r}`);let i=this.tensorManager.registerTensor(e,t,a,n);return ue("verbose",()=>`[WebNN] registerMLTensor {tensor: ${t}, dataType: ${a}, dimensions: ${n}} -> {tensorId: ${i}}`),i}registerMLConstant(e,t,r,n,a,i,s=!1){if(!i)throw new Error("External mounted files are not available.");let u=e;e.startsWith("./")&&(u=e.substring(2));let d=i.get(u);if(!d)throw new Error(`File with name ${u} not found in preloaded files.`);if(t+r>d.byteLength)throw new Error("Out of bounds: data offset and length exceed the external file data size.");let l=d.slice(t,t+r).buffer,f;switch(a.dataType){case"float32":f=new Float32Array(l);break;case"float16":f=typeof Float16Array<"u"&&Float16Array.from?new Float16Array(l):new Uint16Array(l);break;case"int32":f=new Int32Array(l);break;case"uint32":f=new Uint32Array(l);break;case"int64":s?(f=$n(new Uint8Array(l),!1),a.dataType="int32"):f=new BigInt64Array(l);break;case"uint64":f=new BigUint64Array(l);break;case"int8":f=new Int8Array(l);break;case"int4":case"uint4":case"uint8":f=new Uint8Array(l);break;default:throw new Error(`Unsupported data type: ${a.dataType} in creating WebNN Constant from external data.`)}return ue("verbose",()=>`[WebNN] registerMLConstant {dataType: ${a.dataType}, shape: ${a.shape}}} ${s?"(Note: it was int64 data type and registered to int32 as workaround)":""}`),n.constant(a,f)}registerGraphInput(e){this.temporaryGraphInputs.push(e)}isGraphInput(e,t){let r=this.sessionGraphInputs.get(e);return r?r.includes(t):!1}isInt64Supported(e){var t;return!!((t=this.mlContextBySessionId.get(e))!=null&&t.opSupportLimits().input.dataTypes.includes("int64"))}flush(){}}}),Kn=U(()=>{}),Di,Er,Cr,Xs,Ys,Ni,vn,Js,Gd,rg=U(()=>{st(),Kn(),Di=new Map([[64,250],[128,200],[256,200],[512,200],[2048,230],[4096,200],[8192,50],[16384,50],[32768,50],[65536,50],[131072,50],[262144,50],[524288,50],[1048576,50],[2097152,30],[4194304,20],[8388608,10],[12582912,10],[16777216,10],[26214400,15],[33554432,22],[44236800,2],[58982400,6],[67108864,6],[134217728,6],[167772160,6]]),Er=[],Cr=e=>Math.ceil(Number(e)/16)*16,Xs=e=>{for(let t=0;t<Er.length;t++){let r=Er[t];if(e<=r)return r}return Math.ceil(e/16)*16},Ys=1,Ni=()=>Ys++,vn=async(e,t,r,n)=>{let a=Cr(r),i=e.device.createBuffer({size:a,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});try{let s=e.getCommandEncoder();e.endComputePass(),s.copyBufferToBuffer(t,0,i,0,a),e.flush(),await i.mapAsync(GPUMapMode.READ);let u=i.getMappedRange();if(n){let d=n();return d.set(new Uint8Array(u,0,r)),d}else return new Uint8Array(u.slice(0,r))}finally{i.destroy()}},Js=class{constructor(e){this.backend=e,this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.buffersPending=[],this.capturedPendingBuffers=new Map;for(let[t]of Di)Er.push(t),this.freeBuffers.set(t,[]),this.freeUniformBuffers.set(t,[]);this.sessionCount=0}upload(e,t){let r=t.buffer,n=t.byteOffset,a=t.byteLength,i=Cr(a),s=this.storageCache.get(e);if(!s)throw new Error("gpu data for uploading does not exist");if(Number(s.originalSize)!==a)throw new Error(`inconsistent data size. gpu data size=${s.originalSize}, data size=${a}`);let u=this.backend.device.createBuffer({mappedAtCreation:!0,size:i,usage:GPUBufferUsage.MAP_WRITE|GPUBufferUsage.COPY_SRC}),d=u.getMappedRange();new Uint8Array(d).set(new Uint8Array(r,n,a)),u.unmap();let l=this.backend.device.createCommandEncoder();l.copyBufferToBuffer(u,0,s.gpuData.buffer,0,i),this.backend.device.queue.submit([l.finish()]),u.destroy(),ue("verbose",()=>`[WebGPU] GpuDataManager.upload(id=${e})`)}memcpy(e,t){let r=this.storageCache.get(e);if(!r)throw new Error("source gpu data for memcpy does not exist");let n=this.storageCache.get(t);if(!n)throw new Error("destination gpu data for memcpy does not exist");if(r.originalSize!==n.originalSize)throw new Error("inconsistent source and destination gpu data size");let a=Cr(r.originalSize),i=this.backend.getCommandEncoder();this.backend.endComputePass(),i.copyBufferToBuffer(r.gpuData.buffer,0,n.gpuData.buffer,0,a)}registerExternalBuffer(e,t,r){let n;if(r){if(n=r[0],e===r[1])return ue("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${n}, buffer is the same, skip.`),n;if(this.backend.capturedCommandList.has(this.backend.currentSessionId))throw new Error(`Registering a different external buffer under graph capture mode is not supported yet.
             Please use the previous external buffer!`)}else n=Ni();return this.storageCache.set(n,{gpuData:{id:n,type:0,buffer:e},originalSize:t}),ue("verbose",()=>`[WebGPU] GpuDataManager.registerExternalBuffer(size=${t}) => id=${n}, registered.`),n}unregisterExternalBuffer(e){e!==void 0&&(this.storageCache.delete(e),ue("verbose",()=>`[WebGPU] GpuDataManager.unregisterExternalBuffer() => id=${e}`))}create(e,t=GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST){let r=Xs(e),n,a=(t&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE,i=(t&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM;if(a||i){let u=(a?this.freeBuffers:this.freeUniformBuffers).get(r);u?u.length>0?n=u.pop():n=this.backend.device.createBuffer({size:r,usage:t}):n=this.backend.device.createBuffer({size:r,usage:t})}else n=this.backend.device.createBuffer({size:r,usage:t});let s={id:Ni(),type:0,buffer:n};return this.storageCache.set(s.id,{gpuData:s,originalSize:Number(e)}),ue("verbose",()=>`[WebGPU] GpuDataManager.create(size=${e}) => id=${s.id}`),s}get(e){var t;return(t=this.storageCache.get(e))==null?void 0:t.gpuData}release(e){let t=typeof e=="bigint"?Number(e):e,r=this.storageCache.get(t);if(!r){if(this.storageCache.size===0)return 0;throw new Error("releasing data does not exist")}return ue("verbose",()=>`[WebGPU] GpuDataManager.release(id=${t}), gpuDataId=${r.gpuData.id}`),this.storageCache.delete(t),this.buffersPending.push(r.gpuData.buffer),r.originalSize}async download(e,t){let r=this.storageCache.get(Number(e));if(!r)throw new Error("data does not exist");await vn(this.backend,r.gpuData.buffer,r.originalSize,t)}refreshPendingBuffers(){if(this.buffersPending.length!==0)if(this.backend.sessionStatus==="default"){for(let e of this.buffersPending){let t=Di.get(e.size);if((e.usage&GPUBufferUsage.STORAGE)===GPUBufferUsage.STORAGE){let r=this.freeBuffers.get(e.size)||[];t===void 0||r.length>=t?e.destroy():r.push(e)}else if((e.usage&GPUBufferUsage.UNIFORM)===GPUBufferUsage.UNIFORM){let r=this.freeUniformBuffers.get(e.size)||[];t===void 0||r.length>=t?e.destroy():r.push(e)}else e.destroy()}this.buffersPending=[]}else{let e=this.capturedPendingBuffers.get(this.backend.currentSessionId);e||(e=[],this.capturedPendingBuffers.set(this.backend.currentSessionId,e));for(let t of this.buffersPending)e.push(t);this.buffersPending=[]}}dispose(){this.freeBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.freeUniformBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.storageCache.forEach(e=>{e.gpuData.buffer.destroy()}),this.capturedPendingBuffers.forEach(e=>{e.forEach(t=>{t.destroy()})}),this.storageCache=new Map,this.freeBuffers=new Map,this.freeUniformBuffers=new Map,this.capturedPendingBuffers=new Map}onCreateSession(){this.sessionCount+=1}onReleaseSession(e){let t=this.capturedPendingBuffers.get(e);t&&(t.forEach(r=>{r.destroy()}),this.capturedPendingBuffers.delete(e)),this.sessionCount-=1,this.sessionCount===0&&(ue("warning",()=>"[WebGPU] Clearing webgpu buffer cache"),this.storageCache.forEach(r=>{r.gpuData.buffer.destroy()}),this.storageCache=new Map)}},Gd=(...e)=>new Js(...e)}),eo,fe,$e=U(()=>{eo=class{constructor(e){Object.assign(this,e)}get cacheKey(){return this.key||(this.key=Object.getOwnPropertyNames(this).sort().map(e=>`${this[e]}`).join(";")),this.key}},fe=e=>new eo(e)}),qt,zr,Te,Ee,Z,we,xn,Wt,gt,F,Yt,R,H,Hd,Zn,to,Fd,ie=U(()=>{J(),re(),qt=64,zr=(e,t)=>{if(t===3)throw new Error("vec3 has same alignment as vec4, use vec4 instead");switch(Number(e)){case 10:return t>1?`vec${t}<f16>`:"f16";case 1:return t>1?`vec${t}<f32>`:"f32";case 6:return t>1?`vec${t}<i32>`:"i32";case 12:return t>1?`vec${t}<u32>`:"u32";case 7:if(t>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","i32"];case 13:if(t>1)throw new Error("currently not supported vecX of uint64 yet");return["vec2<u32>","u32"];case 9:if(t!==4)throw new Error("bool must be vec4");return["u32","vec4<bool>"];case 22:return"i32";case 21:return"u32";default:throw new Error(`Unknown data type: ${e}`)}},Te=(e,t=1)=>{let r=zr(e,t);return typeof r=="string"?r:r[0]},Ee=(e,t=1)=>{let r=zr(e,t);return typeof r=="string"?r:r[1]},Z=(...e)=>{let t=[];return e.forEach(r=>{r.length!==0&&t.push({type:12,data:r},{type:12,data:z.computeStrides(r)})}),t},we=e=>e%4===0?4:e%2===0?2:1,xn=(e="f32",t,r="0")=>!t||t===1?`${e}(${r})`:`vec${t}<${e}>(${r})`,Wt=(e,t,r)=>e==="f32"?r:t===1?`f32(${r})`:`vec${t}<f32>(${r})`,gt=(e,t)=>t===4?`(${e}.x + ${e}.y + ${e}.z + ${e}.w)`:t===2?`(${e}.x + ${e}.y)`:t===3?`(${e}.x + ${e}.y + ${e}.z)`:e,F=(e,t,r,n)=>e.startsWith("uniforms.")&&r>4?typeof t=="string"?n==="f16"?`${e}[(${t}) / 8][(${t}) % 8 / 4][(${t}) % 8 % 4]`:`${e}[(${t}) / 4][(${t}) % 4]`:n==="f16"?`${e}[${Math.floor(t/8)}][${Math.floor(t%8/4)}][${t%8%4}]`:`${e}[${Math.floor(t/4)}][${t%4}]`:r>1?`${e}[${t}]`:e,Yt=(e,t,r,n,a)=>{let i=typeof r=="number",s=i?r:r.length,u=[...new Array(s).keys()],d=s<2?"u32":s<=4?`vec${s}<u32>`:`array<u32, ${s}>`,l=zr(t,a),f=typeof l=="string"?l:l[1],c=typeof l=="string"?l:l[0],h={indices:d,value:f,storage:c,tensor:t},g=D=>typeof D=="string"?D:`${D}u`,y={offsetToIndices:!1,indicesToOffset:!1,broadcastedIndicesToOffset:!1,set:!1,setByIndices:!1,get:!1,getByIndices:!1},b=i?"uniforms.":"",x=`${b}${e}_shape`,$=`${b}${e}_strides`,w="";for(let D=0;D<s-1;D++)w+=`
    let dim${D} = current / ${F($,D,s)};
    let rest${D} = current % ${F($,D,s)};
    indices[${D}] = dim${D};
    current = rest${D};
    `;w+=`indices[${s-1}] = current;`;let S=s<2?"":`
  fn o2i_${e}(offset: u32) -> ${h.indices} {
    var indices: ${h.indices};
    var current = offset;
    ${w}
    return indices;
  }`,T=D=>(y.offsetToIndices=!0,s<2?D:`o2i_${e}(${D})`),I=[];if(s>=2)for(let D=s-1;D>=0;D--)I.push(`${F($,D,s)} * (indices[${D}])`);let E=s<2?"":`
  fn i2o_${e}(indices: ${h.indices}) -> u32 {
    return ${I.join("+")};
  }`,C=D=>(y.indicesToOffset=!0,s<2?D:`i2o_${e}(${D})`),A=(...D)=>s===0?"0u":`${h.indices}(${D.map(g).join(",")})`,O=(D,P)=>s<2?`${D}`:`${F(D,P,s)}`,W=(D,P,j)=>s<2?`${D}=${j};`:`${F(D,P,s)}=${j};`,X={},G=(D,P)=>{y.broadcastedIndicesToOffset=!0;let j=`${P.name}broadcastedIndicesTo${e}Offset`;if(j in X)return`${j}(${D})`;let se=[];for(let Se=s-1;Se>=0;Se--){let N=P.indicesGet("outputIndices",Se+P.rank-s);se.push(`${O($,Se)} * (${N} % ${O(x,Se)})`)}return X[j]=`fn ${j}(outputIndices: ${P.type.indices}) -> u32 {
             return ${se.length>0?se.join("+"):"0u"};
           }`,`${j}(${D})`},Q=(D,P)=>(()=>{if(h.storage===h.value)return`${e}[${D}]=${P};`;if(h.storage==="vec2<u32>"&&h.value==="i32")return`${e}[${D}]=vec2<u32>(u32(${P}), select(0u, 0xFFFFFFFFu, ${P} < 0));`;if(h.storage==="vec2<u32>"&&h.value==="u32")return`${e}[${D}]=vec2<u32>(u32(${P}), 0u);`;if(h.storage==="u32"&&h.value==="vec4<bool>")return`${e}[${D}]=dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(${P}));`;throw new Error(`not supported combination of storage type ${h.storage} and value type ${h.value} yet`)})(),oe=D=>(()=>{if(h.storage===h.value)return`${e}[${D}]`;if(h.storage==="vec2<u32>"&&h.value==="i32")return`i32(${e}[${D}].x)`;if(h.storage==="vec2<u32>"&&h.value==="u32")return`u32(${e}[${D}].x)`;if(h.storage==="u32"&&h.value==="vec4<bool>")return`vec4<bool>(bool(${e}[${D}] & 0xFFu), bool(${e}[${D}] & 0xFF00u), bool(${e}[${D}] & 0xFF0000u), bool(${e}[${D}] & 0xFF000000u))`;throw new Error(`not supported combination of storage type ${h.storage} and value type ${h.value} yet`)})(),te=s<2?"":`
  fn get_${e}ByIndices(indices: ${h.indices}) -> ${f} {
    return ${oe(`i2o_${e}(indices)`)};
  }`,V=s<2?"":(()=>{let D=u.map(j=>`d${j}: u32`).join(", "),P=u.map(j=>`d${j}`).join(", ");return`
  fn get_${e}(${D}) -> ${f} {
    return get_${e}ByIndices(${A(P)});
  }`})(),L=(...D)=>{if(D.length!==s)throw new Error(`indices length must be ${s}`);let P=D.map(g).join(",");return s===0?oe("0u"):s===1?oe(P[0]):(y.get=!0,y.getByIndices=!0,y.indicesToOffset=!0,`get_${e}(${P})`)},le=D=>s<2?oe(D):(y.getByIndices=!0,y.indicesToOffset=!0,`get_${e}ByIndices(${D})`),ee=s<2?"":`
  fn set_${e}ByIndices(indices: ${h.indices}, value: ${f}) {
    ${Q(`i2o_${e}(indices)`,"value")}
  }`,ne=s<2?"":(()=>{let D=u.map(j=>`d${j}: u32`).join(", "),P=u.map(j=>`d${j}`).join(", ");return`
  fn set_${e}(${D}, value: ${f}) {
    set_${e}ByIndices(${A(P)}, value);
  }`})();return{impl:()=>{let D=[],P=!1;return y.offsetToIndices&&(D.push(S),P=!0),y.indicesToOffset&&(D.push(E),P=!0),y.broadcastedIndicesToOffset&&(Object.values(X).forEach(j=>D.push(j)),P=!0),y.set&&(D.push(ne),P=!0),y.setByIndices&&(D.push(ee),P=!0),y.get&&(D.push(V),P=!0),y.getByIndices&&(D.push(te),P=!0),!i&&P&&D.unshift(`const ${x} = ${h.indices}(${r.join(",")});`,`const ${$} = ${h.indices}(${z.computeStrides(r).join(",")});`),D.join(`
`)},type:h,offsetToIndices:T,indicesToOffset:C,broadcastedIndicesToOffset:G,indices:A,indicesGet:O,indicesSet:W,set:(...D)=>{if(D.length!==s+1)throw new Error(`indices length must be ${s}`);let P=D[s];if(typeof P!="string")throw new Error("value must be string");let j=D.slice(0,s).map(g).join(",");return s===0?Q("0u",P):s===1?Q(j[0],P):(y.set=!0,y.setByIndices=!0,y.indicesToOffset=!0,`set_${e}(${j}, ${P})`)},setByOffset:Q,setByIndices:(D,P)=>s<2?Q(D,P):(y.setByIndices=!0,y.indicesToOffset=!0,`set_${e}ByIndices(${D}, ${P});`),get:L,getByOffset:oe,getByIndices:le,usage:n,name:e,strides:$,shape:x,rank:s}},R=(e,t,r,n=1)=>Yt(e,t,r,"input",n),H=(e,t,r,n=1)=>Yt(e,t,r,"output",n),Hd=(e,t,r)=>Yt(e,t,r,"atomicOutput",1),Zn=(e,t,r,n=1)=>Yt(e,t,r,"internal",n),to=class{constructor(e,t){this.normalizedDispatchGroup=e,this.limits=t,this.internalVariables=[],this.variables=[],this.uniforms=[],this.variableIndex=0}guardAgainstOutOfBoundsWorkgroupSizes(e){return`if (global_idx >= ${typeof e=="number"?`${e}u`:e}) { return; }`}mainStart(e=qt){let t=typeof e=="number"?e:e[0],r=typeof e=="number"?1:e[1],n=typeof e=="number"?1:e[2];if(t>this.limits.maxComputeWorkgroupSizeX||r>this.limits.maxComputeWorkgroupSizeY||n>this.limits.maxComputeWorkgroupSizeZ)throw new Error(`workgroup size [${t}, ${r}, ${n}] exceeds the maximum workgroup size [${this.limits.maxComputeWorkgroupSizeX}, ${this.limits.maxComputeWorkgroupSizeY}, ${this.limits.maxComputeWorkgroupSizeZ}].`);if(t*r*n>this.limits.maxComputeInvocationsPerWorkgroup)throw new Error(`workgroup size [${t}, ${r}, ${n}] exceeds the maximum workgroup invocations ${this.limits.maxComputeInvocationsPerWorkgroup}.`);let a=this.normalizedDispatchGroup[1]===1&&this.normalizedDispatchGroup[2]===1,i=a?`@builtin(global_invocation_id) global_id : vec3<u32>,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(local_invocation_id) local_id : vec3<u32>`:`@builtin(global_invocation_id) global_id : vec3<u32>,
                                             @builtin(local_invocation_id) local_id : vec3<u32>,
    @builtin(local_invocation_index) local_idx : u32,
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(num_workgroups) num_workgroups : vec3<u32>`,s=a?`let global_idx = global_id.x;
         let workgroup_index = workgroup_id.x;`:`let workgroup_index = workgroup_id.z * num_workgroups[0] * num_workgroups[1] +
             workgroup_id.y * num_workgroups[0] + workgroup_id.x;
         let global_idx = workgroup_index * ${t*r*n}u + local_idx;`;return`@compute @workgroup_size(${t}, ${r}, ${n})
  fn main(${i}) {
    ${s}
  `}appendVariableUniforms(e){e.rank!==0&&(e.shape.startsWith("uniforms.")&&this.uniforms.push({name:e.shape.replace("uniforms.",""),type:"u32",length:e.rank}),e.strides.startsWith("uniforms.")&&this.uniforms.push({name:e.strides.replace("uniforms.",""),type:"u32",length:e.rank}))}declareVariable(e,t){if(e.usage==="internal")throw new Error("cannot use internal variable with declareVariable(). use registerInternalVariables() instead.");this.variables.push(e),this.appendVariableUniforms(e);let r=e.usage==="input"?"read":"read_write",n=e.usage==="atomicOutput"?"atomic<i32>":e.type.storage;return`@group(0) @binding(${t}) var<storage, ${r}> ${e.name}: array<${n}>;`}declareVariables(...e){return e.map(t=>this.declareVariable(t,this.variableIndex++)).join(`
`)}registerInternalVariable(e){if(e.usage!=="internal")throw new Error("cannot use input or output variable with registerInternalVariable(). use declareVariables() instead.");this.internalVariables.push(e),this.appendVariableUniforms(e)}registerInternalVariables(...e){return e.forEach(t=>this.registerInternalVariable(t)),this}registerUniform(e,t,r=1){return this.uniforms.push({name:e,type:t,length:r}),this}registerUniforms(e){return this.uniforms=this.uniforms.concat(e),this}uniformDeclaration(){if(this.uniforms.length===0)return"";let e=[];for(let{name:t,type:r,length:n}of this.uniforms)if(n&&n>4)r==="f16"?e.push(`@align(16) ${t}:array<mat2x4<${r}>, ${Math.ceil(n/8)}>`):e.push(`${t}:array<vec4<${r}>, ${Math.ceil(n/4)}>`);else{let a=n==null||n===1?r:`vec${n}<${r}>`;e.push(`${t}:${a}`)}return`
      struct Uniforms { ${e.join(", ")} };
      @group(0) @binding(${this.variableIndex}) var<uniform> uniforms: Uniforms;`}get additionalImplementations(){return this.uniformDeclaration()+this.variables.map(e=>e.impl()).join(`
`)+this.internalVariables.map(e=>e.impl()).join(`
`)}get variablesInfo(){if(this.uniforms.length===0)return;let e=t=>[12,10,1,6][["u32","f16","f32","i32"].indexOf(t)];return this.uniforms.map(t=>[e(t.type),t.length??1])}},Fd=(e,t)=>new to(e,t)}),ro,Mi,io,no,ao,so,De,Kd,Zd,yt=U(()=>{J(),re(),$e(),ie(),ro=(e,t)=>{if(!e||e.length!==1)throw new Error("Transpose requires 1 input.");if(t.length!==0&&t.length!==e[0].dims.length)throw new Error(`perm size ${t.length} does not match input rank ${e[0].dims.length}`)},Mi=(e,t)=>t.length!==0?t:[...new Array(e).keys()].reverse(),io=(e,t)=>z.sortBasedOnPerm(e,Mi(e.length,t)),no=(e,t,r,n)=>{let a=`fn perm(i: ${n.type.indices}) -> ${r.type.indices} {
    var a: ${r.type.indices};`;for(let i=0;i<t;++i)a+=`a[${e[i]}]=i[${i}];`;return a+="return a;}"},ao=(e,t)=>{let r=[],n=[];for(let a=0;a<e.length;++a)e[a]!==1&&r.push(e[a]),e[t[a]]!==1&&n.push(t[a]);return{newShape:r,newPerm:n}},so=(e,t)=>{let r=0;for(let n=0;n<e.length;++n)if(t[e[n]]!==1){if(e[n]<r)return!1;r=e[n]}return!0},De=(e,t)=>{let r=e.dataType,n=e.dims.length,a=Mi(n,t),i=io(e.dims,a),s=e.dims,u=i,d=n<2||so(a,e.dims),l;if(d)return l=y=>{let b=R("input",r,s,4),x=H("output",r,u,4);return`
  ${y.registerUniform("output_size","u32").declareVariables(b,x)}
  ${y.mainStart()}
    ${y.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    output[global_idx] = input[global_idx];
  }`},{name:"TransposeCopy",shaderCache:{inputDependencies:["type"]},getRunData:()=>{let y=z.size(i);return{outputs:[{dims:i,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(y/64/4)},programUniforms:[{type:12,data:Math.ceil(y/4)}]}},getShaderSource:l};let{newShape:f,newPerm:c}=ao(e.dims,a),h=z.areEqual(c,[2,3,1]),g=z.areEqual(c,[3,1,2]);if(f.length===2||h||g){s=h?[f[0],f[1]*f[2]]:g?[f[0]*f[1],f[2]]:f,u=[s[1],s[0]];let y=16;return l=b=>{let x=R("a",r,s.length),$=H("output",r,u.length);return`
  ${b.registerUniform("output_size","u32").declareVariables(x,$)}
  var<workgroup> tile : array<array<${$.type.value}, ${y+1}>, ${y}>;
  ${b.mainStart([y,y,1])}
    let stride = (uniforms.output_shape[1] - 1) / ${y} + 1;
    let workgroup_id_x = workgroup_index % stride;
    let workgroup_id_y = workgroup_index / stride;
    let input_col = workgroup_id_y * ${y}u + local_id.x;
    let input_row = workgroup_id_x * ${y}u + local_id.y;
    if (input_row < uniforms.a_shape[0] && input_col < uniforms.a_shape[1]) {
      tile[local_id.y][local_id.x] = ${x.getByIndices(`${x.type.indices}(input_row, input_col)`)};
    }
    workgroupBarrier();

    let output_col = workgroup_id_x * ${y}u + local_id.x;
    let output_row = workgroup_id_y * ${y}u + local_id.y;
    if (output_row < uniforms.output_shape[0] && output_col < uniforms.output_shape[1]) {
      ${$.setByIndices(`${$.type.indices}(output_row, output_col)`,"tile[local_id.x][local_id.y]")}
    }
  }`},{name:"TransposeShared",shaderCache:{inputDependencies:["type"]},getRunData:()=>{let b=z.size(i);return{outputs:[{dims:i,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(u[1]/y),y:Math.ceil(u[0]/y)},programUniforms:[{type:12,data:b},...Z(s,u)]}},getShaderSource:l}}return l=y=>{let b=R("a",r,s.length),x=H("output",r,u.length);return`
  ${y.registerUniform("output_size","u32").declareVariables(b,x)}

  ${no(a,n,b,x)}

  ${y.mainStart()}
    ${y.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${x.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${x.setByOffset("global_idx",b.getByIndices("aIndices"))}
  }`},{name:"Transpose",shaderCache:{hint:`${t}`,inputDependencies:["rank"]},getRunData:()=>{let y=z.size(i);return{outputs:[{dims:i,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(y/64)},programUniforms:[{type:12,data:y},...Z(s,u)]}},getShaderSource:l}},Kd=(e,t)=>{ro(e.inputs,t.perm),e.compute(De(e.inputs[0],t.perm))},Zd=e=>fe({perm:e.perm})}),oo,uo,lo,po,fo,co,ho,mo,go,yo,Le,Qd,Xd,Yd,Jd,ep,tp,rp,ip,np,ap,ig=U(()=>{J(),re(),ie(),Qn(),yt(),oo={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate * candidate",logSumExp:"bestValue + exp(candidate)",l1:"bestValue + abs(candidate)",l2:"bestValue + candidate * candidate",logSum:"bestValue + candidate"},uo={max:"select(bestValue, candidate, candidate > bestValue)",min:"select(bestValue, candidate, candidate < bestValue)",mean:"bestValue + candidate",sum:"bestValue + candidate",prod:"bestValue * candidate",sumSquare:"bestValue + candidate",logSumExp:"bestValue + candidate",l1:"bestValue + candidate",l2:"bestValue + candidate",logSum:"bestValue + candidate"},lo={max:"_A[offset]",min:"_A[offset]",mean:"0",sum:"0",prod:"1",sumSquare:"0",logSumExp:"0",l1:"0",l2:"0",logSum:"0"},po={max:"bestValue",min:"bestValue",sum:"bestValue",prod:"bestValue",sumSquare:"bestValue",logSumExp:"log(bestValue)",l1:"bestValue",l2:"sqrt(bestValue)",logSum:"log(bestValue)"},fo=(e,t)=>{let r=[];for(let n=t-e;n<t;++n)r.push(n);return r},co=(e,t)=>{let r=[],n=e.length;for(let i=0;i<n;i++)t.indexOf(i)===-1&&r.push(e[i]);let a=t.map(i=>e[i]);return[r,a]},ho=(e,t)=>{let r=e.length+t.length,n=[],a=0;for(let i=0;i<r;i++)t.indexOf(i)===-1?n.push(e[a++]):n.push(1);return n},mo=(e,t)=>{for(let r=0;r<e.length;++r)if(e[e.length-r-1]!==t-1-r)return!1;return!0},go=(e,t)=>{let r=[];if(!mo(e,t)){for(let n=0;n<t;++n)e.indexOf(n)===-1&&r.push(n);e.forEach(n=>r.push(n))}return r},yo=(e,t,r,n,a,i,s)=>{let u=r[0].dims,d=z.size(i),l=z.size(s),f=R("_A",r[0].dataType,u),c=H("output",a,i),h=64;d===1&&(h=256);let g=`
          var<workgroup> aBestValues : array<f32, ${h}>;
       `,y=b=>`
        ${b.registerUniform("reduceSize","u32").declareVariables(f,c)}
        ${g}
        fn DIV_CEIL(a : u32, b : u32) -> u32 {
          return ((a - 1u) / b + 1u);
         }
         ${b.mainStart(h)}

          let outputIndex = global_idx / ${h};
          let offset = outputIndex * uniforms.reduceSize;

          var bestValue = f32(${lo[n]});
          let Length = uniforms.reduceSize;
          for (var k = local_idx; k < Length; k = k + ${h}) {
           let candidate = f32(${f.getByOffset("offset + k")});
           bestValue = ${oo[n]};
          }
          aBestValues[local_idx] = bestValue;
          workgroupBarrier();

         var reduceSize = min(Length, ${h}u);
         for (var currentSize = reduceSize / 2u; reduceSize > 1u;
             currentSize = reduceSize / 2u) {
           let interval = DIV_CEIL(reduceSize, 2u);
           if (local_idx < currentSize) {
            let candidate = aBestValues[local_idx + interval];
            bestValue = ${uo[n]};
            aBestValues[local_idx] = bestValue;
           }
           reduceSize = interval;
           workgroupBarrier();
         }

         if (local_idx == 0u) {
          ${c.setByOffset("outputIndex",`${n==="mean"?`${c.type.storage}(bestValue / f32(uniforms.reduceSize))`:`${c.type.storage}(${po[n]})`}`)};
         }
        }`;return{name:e,shaderCache:{hint:`${t};${h}`,inputDependencies:["type"]},getShaderSource:y,getRunData:()=>({outputs:[{dims:i,dataType:a}],dispatchGroup:{x:d},programUniforms:[{type:12,data:l}]})}},Le=(e,t,r,n)=>{let a=e.inputs.length===1?r:Tn(e.inputs,r),i=a.axes;i.length===0&&!a.noopWithEmptyAxes&&(i=e.inputs[0].dims.map((g,y)=>y));let s=z.normalizeAxes(i,e.inputs[0].dims.length),u=s,d=e.inputs[0],l=go(u,e.inputs[0].dims.length);l.length>0&&(d=e.compute(De(e.inputs[0],l),{inputs:[0],outputs:[-1]})[0],u=fo(u.length,d.dims.length));let[f,c]=co(d.dims,u),h=f;a.keepDims&&(h=ho(f,s)),e.compute(yo(t,a.cacheKey,[d],n,e.inputs[0].dataType,h,c),{inputs:[d]})},Qd=(e,t)=>{Le(e,"ReduceMeanShared",t,"mean")},Xd=(e,t)=>{Le(e,"ReduceL1Shared",t,"l1")},Yd=(e,t)=>{Le(e,"ReduceL2Shared",t,"l2")},Jd=(e,t)=>{Le(e,"ReduceLogSumExpShared",t,"logSumExp")},ep=(e,t)=>{Le(e,"ReduceMaxShared",t,"max")},tp=(e,t)=>{Le(e,"ReduceMinShared",t,"min")},rp=(e,t)=>{Le(e,"ReduceProdShared",t,"prod")},ip=(e,t)=>{Le(e,"ReduceSumShared",t,"sum")},np=(e,t)=>{Le(e,"ReduceSumSquareShared",t,"sumSquare")},ap=(e,t)=>{Le(e,"ReduceLogSumShared",t,"logSum")}}),qe,_o,Gr,Tn,Ve,bo,wo,$o,vo,xo,To,So,Io,ko,Eo,je,sp,op,up,lp,dp,pp,fp,cp,hp,mp,Qn=U(()=>{J(),re(),$e(),ie(),ig(),qe=e=>{if(!e||e.length===0||e.length>2)throw new Error("Reduce op requires 1 or 2 inputs.");if(e.length===2&&e[1].dims.length!==1)throw new Error("Invalid axes input dims.")},_o=e=>["","",`var value = ${e.getByIndices("input_indices")};`,""],Gr=(e,t,r,n,a,i,s=!1,u=!1)=>{let d=[],l=r[0].dims,f=l.length,c=z.normalizeAxes(a,f),h=!u&&c.length===0;l.forEach((b,x)=>{h||c.indexOf(x)>=0?s&&d.push(1):d.push(b)});let g=d.length,y=z.size(d);return{name:e,shaderCache:t,getShaderSource:b=>{let x=[],$=R("_A",r[0].dataType,f),w=H("output",i,g),S=n($,w,c),T=S[2];for(let I=0,E=0;I<f;I++)h||c.indexOf(I)>=0?(s&&E++,T=`for(var j${I}: u32 = 0; j${I} < ${l[I]}; j${I}++) {
                  ${S[2].includes("last_index")?`let last_index = j${I};`:""}
                  ${$.indicesSet("input_indices",I,`j${I}`)}
                  ${T}
                }`):(x.push(`${$.indicesSet("input_indices",I,w.indicesGet("output_indices",E))};`),E++);return`

        ${b.registerUniform("output_size","u32").declareVariables($,w)}

        ${b.mainStart()}
          ${b.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          var input_indices: ${$.type.indices};
          let output_indices = ${w.offsetToIndices("global_idx")};

          ${x.join(`
`)}
          ${S[0]}       // init ops for reduce max/min
          ${S[1]}
          ${T}
          ${S[3]}
          ${S.length===4?w.setByOffset("global_idx","value"):S.slice(4).join(`
`)}
        }`},getRunData:()=>({outputs:[{dims:d,dataType:i}],dispatchGroup:{x:Math.ceil(y/64)},programUniforms:[{type:12,data:y},...Z(l,d)]})}},Tn=(e,t)=>{let r=[];return e[1].dims[0]>0&&e[1].getBigInt64Array().forEach(n=>r.push(Number(n))),fe({axes:r,keepDims:t.keepDims,noopWithEmptyAxes:t.noopWithEmptyAxes})},Ve=(e,t,r,n)=>{let a=e.inputs,i=a.length===1?r:Tn(a,r);e.compute(Gr(t,{hint:i.cacheKey,inputDependencies:["rank"]},[a[0]],i.noopWithEmptyAxes&&i.axes.length===0?_o:n,i.axes,a[0].dataType,i.keepDims,i.noopWithEmptyAxes),{inputs:[0]})},bo=(e,t)=>{qe(e.inputs),Ve(e,"ReduceLogSum",t,(r,n)=>[`var value = ${n.type.storage}(0);`,"",`value += ${r.getByIndices("input_indices")};`,"value = log(value);"])},wo=(e,t)=>{qe(e.inputs),Ve(e,"ReduceL1",t,(r,n)=>[`var value = ${n.type.storage}(0);`,"",`value += abs(${r.getByIndices("input_indices")});`,""])},$o=(e,t)=>{qe(e.inputs),Ve(e,"ReduceL2",t,(r,n)=>[`var t = ${n.type.value}(0); var value = ${n.type.value}(0);`,"",`t = ${r.getByIndices("input_indices")}; value += (t * t);`,"value = sqrt(value);"])},vo=(e,t)=>{qe(e.inputs),Ve(e,"ReduceLogSumExp",t,(r,n)=>[`var value = ${n.type.storage}(0);`,"",`value += exp(${r.getByIndices("input_indices")});`,"value = log(value);"])},xo=(e,t)=>{qe(e.inputs),Ve(e,"ReduceMax",t,(r,n,a)=>{let i=[];for(let s=0;s<r.rank;s++)(a.indexOf(s)>=0||a.length===0)&&i.push(r.indicesSet("input_indices",s,0));return[`${i.join(`
`)}`,`var value = ${r.getByIndices("input_indices")};`,`value = max(value, ${r.getByIndices("input_indices")});`,""]})},To=(e,t)=>{qe(e.inputs),Ve(e,"ReduceMean",t,(r,n,a)=>{let i=1;for(let s=0;s<r.rank;s++)(a.indexOf(s)>=0||a.length===0)&&(i*=e.inputs[0].dims[s]);return["var sum = f32(0);","",`sum += f32(${r.getByIndices("input_indices")});`,`let value = ${n.type.value}(sum / ${i});`]})},So=(e,t)=>{qe(e.inputs),Ve(e,"ReduceMin",t,(r,n,a)=>{let i=[];for(let s=0;s<r.rank;s++)(a.indexOf(s)>=0||a.length===0)&&i.push(`input_indices[${s}] = 0;`);return[`${i.join(`
`)}`,`var value = ${r.getByIndices("input_indices")};`,`value = min(value, ${r.getByIndices("input_indices")});`,""]})},Io=(e,t)=>{qe(e.inputs),Ve(e,"ReduceProd",t,(r,n)=>[`var value = ${n.type.storage}(1);`,"",`value *= ${r.getByIndices("input_indices")};`,""])},ko=(e,t)=>{qe(e.inputs),Ve(e,"ReduceSum",t,(r,n)=>[`var value = ${n.type.storage}(0);`,"",`value += ${r.getByIndices("input_indices")};`,""])},Eo=(e,t)=>{qe(e.inputs),Ve(e,"ReduceSumSquare",t,(r,n)=>[`var t = ${n.type.value}(0); var value = ${n.type.value}(0);`,"",`t = ${r.getByIndices("input_indices")}; value += t * t;`,""])},je=(e,t,r)=>{if(t.length===0)return r;let n=1,a=1;for(let i=0;i<t.length;i++)t.indexOf(i)===-1?n*=e[i]:a*=e[i];return a<32&&n>1024},sp=(e,t)=>{je(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?To(e,t):Qd(e,t)},op=(e,t)=>{je(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?wo(e,t):Xd(e,t)},up=(e,t)=>{je(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?$o(e,t):Yd(e,t)},lp=(e,t)=>{je(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?vo(e,t):Jd(e,t)},dp=(e,t)=>{je(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?xo(e,t):ep(e,t)},pp=(e,t)=>{je(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?So(e,t):tp(e,t)},fp=(e,t)=>{je(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Io(e,t):rp(e,t)},cp=(e,t)=>{je(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?ko(e,t):ip(e,t)},hp=(e,t)=>{je(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?Eo(e,t):np(e,t)},mp=(e,t)=>{je(e.inputs[0].dims,t.axes,t.noopWithEmptyAxes)?bo(e,t):ap(e,t)}}),Pi,gp,yp,Sn,ng=U(()=>{J(),$e(),Qn(),Pi=e=>{if(!e||e.length===0||e.length>2)throw new Error("ArgMinMaxOp op requires 1 or 2 inputs.");if(e[0].dataType!==1)throw new Error("Invalid input type.")},gp=(e,t)=>{Pi(e.inputs);let r=(n,a,i)=>{let s=[];for(let u=0;u<n.rank;u++)(i.indexOf(u)>=0||i.length===0)&&s.push(`input_indices[${u}] = 0;`);return[`${s.join(`
`)}`,`var value = ${n.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${n.getByIndices("input_indices")} ${t.selectLastIndex>0?"<=":"<"} value) {
         value = ${n.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",a.setByOffset("global_idx","best_index")]};e.compute(Gr("ArgMin",{hint:t.cacheKey,inputDependencies:["rank"]},[e.inputs[0]],r,[t.axis],7,t.keepDims),{inputs:[0]})},yp=(e,t)=>{Pi(e.inputs);let r=(n,a,i)=>{let s=[];for(let u=0;u<n.rank;u++)(i.indexOf(u)>=0||i.length===0)&&s.push(`input_indices[${u}] = 0;`);return[`${s.join(`
`)}`,`var value = ${n.getByIndices("input_indices")};
var best_index : i32 = 0;`,`if (${n.getByIndices("input_indices")} ${t.selectLastIndex>0?">=":">"} value) {
         value = ${n.getByIndices("input_indices")};
         best_index = i32(last_index);
       }`,"",a.setByOffset("global_idx","best_index")]};e.compute(Gr("argMax",{hint:t.cacheKey,inputDependencies:["rank"]},[e.inputs[0]],r,[t.axis],7,t.keepDims),{inputs:[0]})},Sn=e=>fe(e)}),Co,Ar,zo,Ao,Oo,fr,Bo,_p,Xn=U(()=>{J(),re(),Kn(),ie(),Co=(e,t)=>{let r=e[0],n=e[1],a=e[2],i=e[3],s=e[4],u=e[5];if(s&&u)throw new Error("Attention cannot have both past and attention_bias");if(r.dims.length!==3)throw new Error('Input "input" must have 3 dimensions');let d=r.dims[0],l=r.dims[1],f=r.dims[2];if(a.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimensions');if(n.dims.length!==2)throw new Error('Input "weights" is expected to have 2 dimensions');if(n.dims[0]!==f)throw new Error("Input 1 dimension 0 should have same length as dimension 2 of input 0");if(a.dims[0]!==n.dims[1])throw new Error('Input "bias" dimension 0 should have same length as dimension 1 of input "weights"');let c=a.dims[0]/3,h=c,g=h;if(t.qkvHiddenSizes.length>0){if(t.qkvHiddenSizes.length!==3)throw new Error("qkv_hidden_sizes attribute should have 3 elements");for(let S of t.qkvHiddenSizes)if(S%t.numHeads!==0)throw new Error("qkv_hidden_sizes should be divisible by num_heads");c=t.qkvHiddenSizes[0],h=t.qkvHiddenSizes[1],g=t.qkvHiddenSizes[2]}let y=l;if(c!==h)throw new Error("qkv_hidden_sizes first element should be same as the second");if(a.dims[0]!==c+h+g)throw new Error('Input "bias" dimension 0 should have same length as sum of Q/K/V hidden sizes');let b=0;if(s){if(h!==g)throw new Error('Input "past" expect k_hidden_size == v_hidden_size');if(s.dims.length!==5)throw new Error('Input "past" must have 5 dimensions');if(s.dims[0]!==2)throw new Error('Input "past" first dimension must be 2');if(s.dims[1]!==d)throw new Error('Input "past" second dimension must be batch_size');if(s.dims[2]!==t.numHeads)throw new Error('Input "past" third dimension must be num_heads');if(s.dims[4]!==h/t.numHeads)throw new Error('Input "past" fifth dimension must be k_hidden_size / num_heads');t.pastPresentShareBuffer||(b=s.dims[3])}let x=y+b,$=-1,w=0;if(i)throw new Error("Mask not supported");if(s)throw new Error("past is not supported");if(u){if(u.dims.length!==4)throw new Error('Input "attention_bias" must have 4 dimensions');if(u.dims[0]!==d||u.dims[1]!==t.numHeads||u.dims[2]!==l||u.dims[3]!==x)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:d,sequenceLength:l,pastSequenceLength:b,kvSequenceLength:y,totalSequenceLength:x,maxSequenceLength:$,inputHiddenSize:f,hiddenSize:c,vHiddenSize:g,headSize:Math.floor(c/t.numHeads),vHeadSize:Math.floor(g/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:w,scale:t.scale,broadcastResPosBias:!1,passPastInKv:!1,qkvFormat:1}},Ar=(e,t,r)=>t&&e?`
      let total_sequence_length_input = u32(${t.getByOffset("0")});
      let present_sequence_length = max(total_sequence_length_input, uniforms.past_sequence_length);
      let is_subsequent_prompt: bool = sequence_length > 1 && sequence_length != total_sequence_length_input;
      let is_first_prompt: bool = is_subsequent_prompt == false && sequence_length == total_sequence_length_input;
      total_sequence_length = u32(${e==null?void 0:e.getByOffset("batchIdx")}) + 1;
      var past_sequence_length: u32 = 0;
      if (is_first_prompt == false) {
        past_sequence_length = total_sequence_length - sequence_length;
      }
       `:`
    ${r?"let past_sequence_length = uniforms.past_sequence_length":""};
    let present_sequence_length = total_sequence_length;
    `,zo=(e,t,r,n,a,i,s,u)=>{let d=we(s?1:i),l=64,f=i/d;f<l&&(l=32);let c=Math.ceil(i/d/l),h=[{type:12,data:t},{type:12,data:r},{type:12,data:n},{type:12,data:a},{type:12,data:f},{type:12,data:c}],g=Te(e.dataType,d),y=Ee(1,d),b=["type"];s&&b.push("type"),u&&b.push("type");let x=$=>{let w=H("x",e.dataType,e.dims,d),S=[w],T=s?R("seq_lens",s.dataType,s.dims):void 0;T&&S.push(T);let I=u?R("total_sequence_length_input",u.dataType,u.dims):void 0;I&&S.push(I);let E=Ee(e.dataType),C=[{name:"batch_size",type:"u32"},{name:"num_heads",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"sequence_length",type:"u32"},{name:"total_sequence_length",type:"u32"},{name:"elements_per_thread",type:"u32"}];return`
  var<workgroup> thread_max: array<f32, ${l}>;
  var<workgroup> thread_sum: array<f32, ${l}>;
  ${$.registerUniforms(C).declareVariables(...S)}
  ${$.mainStart([l,1,1])}
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let sequence_length = uniforms.sequence_length;
    var total_sequence_length = uniforms.total_sequence_length;
    ${Ar(T,I,!1)}
    let local_offset = local_idx * uniforms.elements_per_thread;
    let offset = (global_idx / ${l}) * uniforms.total_sequence_length + local_offset;
    let seq_causal_length = ${s?"u32(past_sequence_length + workgroup_id.y + 1)":"total_sequence_length"};
    var thread_max_vector = ${y}(-3.402823e+38f);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
      thread_max_vector = max(${y}(x[offset + i]), thread_max_vector);
    }
    thread_max[local_idx] = ${(()=>{switch(d){case 1:return"thread_max_vector";case 2:return"max(thread_max_vector.x, thread_max_vector.y)";case 4:return"max(max(thread_max_vector.x, thread_max_vector.y), max(thread_max_vector.z, thread_max_vector.w))";default:throw new Error(`Unsupported components: ${d}`)}})()};
    workgroupBarrier();

    var max_value =  f32(-3.402823e+38f);
    for (var i = 0u; i < ${l}; i++) {
      max_value = max(thread_max[i], max_value);
    }

    var sum_vector = ${y}(0);
    for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
      sum_vector += exp(${y}(x[offset + i]) - max_value);
    }
    thread_sum[local_idx] = ${(()=>{switch(d){case 1:return"sum_vector";case 2:return"sum_vector.x + sum_vector.y";case 4:return"sum_vector.x + sum_vector.y + sum_vector.z + sum_vector.w";default:throw new Error(`Unsupported components: ${d}`)}})()};
    workgroupBarrier();

    var sum: f32 = 0;
    for (var i = 0u; i < ${l}; i++) {
      sum += thread_sum[i];
    }

    if (sum == 0) {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
        x[offset + i] = ${w.type.value}(${E}(1.0) / ${E}(seq_causal_length));
      }
    } else {
      for (var i: u32 = 0; i < uniforms.elements_per_thread && i + local_offset < seq_causal_length; i++) {
        var f32input = ${y}(x[offset + i]);
        x[offset + i] = ${w.type.value}(exp(f32input - max_value) / sum);
      }
    }
      ${s?`
        for (var total_seq_id: u32 = seq_causal_length; total_seq_id + local_offset < uniforms.total_sequence_length; total_seq_id++) {
          x[offset + total_seq_id] = ${w.type.value}(${E}(0));
        }`:""};
  }`};return{name:"AttentionProbsSoftmax",shaderCache:{hint:`${l};${g};${d}`,inputDependencies:b},getShaderSource:x,getRunData:()=>({outputs:[],dispatchGroup:{x:1,y:a,z:t*r},programUniforms:h})}},Ao=(e,t,r,n,a,i,s,u,d)=>{let l=s+i.kvSequenceLength,f=[i.batchSize,i.numHeads,i.sequenceLength,l],c=e>1&&n,h=i.kvNumHeads?i.kvNumHeads:i.numHeads,g=c?[i.batchSize,h,l,i.headSize]:void 0,y=i.nReps?i.nReps:1,b=i.scale===0?1/Math.sqrt(i.headSize):i.scale,x=we(i.headSize),$=i.headSize/x,w=12,S={x:Math.ceil(l/w),y:Math.ceil(i.sequenceLength/w),z:i.batchSize*i.numHeads},T=[{type:12,data:i.sequenceLength},{type:12,data:$},{type:12,data:l},{type:12,data:i.numHeads},{type:12,data:i.headSize},{type:1,data:b},{type:12,data:s},{type:12,data:i.kvSequenceLength},{type:12,data:y}],I=c&&n&&z.size(n.dims)>0,E=["type","type"];I&&E.push("type"),a&&E.push("type"),u&&E.push("type"),d&&E.push("type");let C=[{dims:f,dataType:t.dataType,gpuDataType:0}];c&&C.push({dims:g,dataType:t.dataType,gpuDataType:0});let A=O=>{let W=R("q",t.dataType,t.dims,x),X=R("key",r.dataType,r.dims,x),G=[W,X];if(I){let ee=R("past_key",n.dataType,n.dims,x);G.push(ee)}a&&G.push(R("attention_bias",a.dataType,a.dims));let Q=u?R("seq_lens",u.dataType,u.dims):void 0;Q&&G.push(Q);let oe=d?R("total_sequence_length_input",d.dataType,d.dims):void 0;oe&&G.push(oe);let te=H("output",t.dataType,f),V=[te];c&&V.push(H("present_key",t.dataType,g,x));let L=Ee(1,x),le=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"alpha",type:"f32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"},{name:"n_reps",type:"u32"}];return`
  const TILE_SIZE = ${w}u;

  var<workgroup> tileQ: array<${W.type.storage}, ${w*w}>;
  var<workgroup> tileK: array<${W.type.storage}, ${w*w}>;
  ${O.registerUniforms(le).declareVariables(...G,...V)}
  ${O.mainStart([w,w,1])}
    // x holds the N and y holds the M
    let headIdx = workgroup_id.z % uniforms.num_heads;
    let kvHeadIdx = ${y===1?"headIdx":"headIdx / uniforms.n_reps"};
    let kv_num_heads = ${y===1?"uniforms.num_heads":"uniforms.num_heads / uniforms.n_reps"};
    let batchIdx = workgroup_id.z / uniforms.num_heads;
    let m = workgroup_id.y * TILE_SIZE;
    let n = workgroup_id.x * TILE_SIZE;
    let sequence_length = uniforms.M;
    var total_sequence_length = uniforms.N;
    ${Ar(Q,oe,!0)}
    let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx;
    let qOffset = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
    ${I&&c?"let pastKeyOffset = absKvHeadIdx * uniforms.past_sequence_length * uniforms.K;":""};
    let kOffset = absKvHeadIdx * uniforms.kv_sequence_length * uniforms.K;
    ${c?"let presentKeyOffset = absKvHeadIdx * uniforms.N * uniforms.K;":""}
    var value = ${L}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (global_id.y < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = q[qOffset + local_id.y * uniforms.K + w + local_id.x];
      }
      if (n + local_id.y < uniforms.N && w + local_id.x < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
      ${I&&c?`
              if (n + local_id.y < past_sequence_length) {
                tileK[idx] = past_key[pastKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
              } else if (n + local_id.y - past_sequence_length < uniforms.kv_sequence_length) {
                tileK[idx] = key[kOffset + (n + local_id.y - past_sequence_length) * uniforms.K + w + local_id.x];
              }`:`
          if (n + local_id.y < uniforms.kv_sequence_length) {
            tileK[idx] = key[kOffset + (n + local_id.y) * uniforms.K + w + local_id.x];
          }`}
      ${c?`if (n + local_id.y < present_sequence_length) {
        present_key[presentKeyOffset + (n + local_id.y) * uniforms.K + w + local_id.x] = tileK[idx];
      }`:""}
      }
      workgroupBarrier();

      for (var k: u32 = 0u; k < TILE_SIZE && w+k < uniforms.K; k++) {
          value += ${L}(tileQ[TILE_SIZE * local_id.y + k] * tileK[TILE_SIZE * local_id.x + k]);
      }

      workgroupBarrier();
    }

    if (global_id.y < uniforms.M && global_id.x < total_sequence_length) {
      let headOffset = workgroup_id.z * uniforms.M * uniforms.N;
      let outputIdx = headOffset + global_id.y * uniforms.N + global_id.x;
      var sum: f32 = ${(()=>{switch(x){case 1:return"value";case 2:return"value.x + value.y";case 4:return"value.x + value.y + value.z + value.w";default:throw new Error(`Unsupported components: ${x}`)}})()};
        output[outputIdx] = ${te.type.value} (sum * uniforms.alpha) + ${a?"attention_bias[outputIdx]":"0.0"};
    }
  }`};return{name:"AttentionProbs",shaderCache:{hint:`${x};${a!==void 0};${n!==void 0};${e}`,inputDependencies:E},getRunData:()=>({outputs:C,dispatchGroup:S,programUniforms:T}),getShaderSource:A}},Oo=(e,t,r,n,a,i,s=void 0,u=void 0)=>{let d=i+a.kvSequenceLength,l=a.nReps?a.nReps:1,f=a.vHiddenSize*l,c=e>1&&n,h=a.kvNumHeads?a.kvNumHeads:a.numHeads,g=c?[a.batchSize,h,d,a.headSize]:void 0,y=[a.batchSize,a.sequenceLength,f],b=12,x={x:Math.ceil(a.vHeadSize/b),y:Math.ceil(a.sequenceLength/b),z:a.batchSize*a.numHeads},$=[{type:12,data:a.sequenceLength},{type:12,data:d},{type:12,data:a.vHeadSize},{type:12,data:a.numHeads},{type:12,data:a.headSize},{type:12,data:f},{type:12,data:i},{type:12,data:a.kvSequenceLength},{type:12,data:l}],w=c&&n&&z.size(n.dims)>0,S=["type","type"];w&&S.push("type"),s&&S.push("type"),u&&S.push("type");let T=[{dims:y,dataType:t.dataType,gpuDataType:0}];c&&T.push({dims:g,dataType:t.dataType,gpuDataType:0});let I=E=>{let C=R("probs",t.dataType,t.dims),A=R("v",r.dataType,r.dims),O=[C,A];w&&O.push(R("past_value",n.dataType,n.dims));let W=s?R("seq_lens",s.dataType,s.dims):void 0;s&&O.push(W);let X=u?R("total_sequence_length_input",u.dataType,u.dims):void 0;u&&O.push(X);let G=[H("output",t.dataType,y)];c&&G.push(H("present_value",t.dataType,g));let Q=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"v_hidden_size",type:"u32"},{name:"past_sequence_length",type:"u32"},{name:"kv_sequence_length",type:"u32"},{name:"n_reps",type:"u32"}];return`
  const TILE_SIZE = ${b}u;
  var<workgroup> tileQ: array<${C.type.value}, ${b*b}>;
  var<workgroup> tileV: array<${C.type.value}, ${b*b}>;
  ${E.registerUniforms(Q).declareVariables(...O,...G)}
  ${E.mainStart([b,b,1])}
   let headIdx = workgroup_id.z % uniforms.num_heads;
   let batchIdx = workgroup_id.z / uniforms.num_heads;
   let kvHeadIdx = ${l===1?"headIdx":"headIdx / uniforms.n_reps"};
   let kv_num_heads = ${l===1?"uniforms.num_heads":"uniforms.num_heads / uniforms.n_reps"};
   let m = global_id.y;
   let n = global_id.x;
   let sequence_length = uniforms.M;
   var total_sequence_length = uniforms.K;
   ${Ar(W,X,!0)}
   let offsetA = workgroup_id.z * uniforms.M * uniforms.K + m * uniforms.K;
   let absKvHeadIdx = batchIdx * kv_num_heads + kvHeadIdx; // kvHeadIdx is relative to the batch
   ${w&&c?"let pastValueOffset = absKvHeadIdx * uniforms.N * uniforms.past_sequence_length + n;":""};
   let vOffset = absKvHeadIdx * uniforms.N * uniforms.kv_sequence_length + n;
   ${c?"let presentValueOffset = absKvHeadIdx * uniforms.N * uniforms.K + n;":""}
   var value = ${C.type.storage}(0);
   for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileQ[TILE_SIZE * local_id.y + local_id.x] = probs[offsetA + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        var idx = TILE_SIZE * local_id.y + local_id.x;
        ${w&&c?`
        if (w + local_id.y < past_sequence_length) {
          tileV[idx] = past_value[pastValueOffset + (w + local_id.y) * uniforms.N];
        } else if (w + local_id.y - past_sequence_length < uniforms.kv_sequence_length) {
          tileV[idx] = v[vOffset + (w + local_id.y - past_sequence_length) * uniforms.N];
        }
      `:`
            if (w + local_id.y < uniforms.kv_sequence_length) {
              tileV[idx] = v[vOffset + (w + local_id.y) * uniforms.N];
            }`}
        ${c?`
            if (w + local_id.y < present_sequence_length) {
          present_value[presentValueOffset + (w + local_id.y) * uniforms.N] = tileV[idx];
        }`:""}
      }
     workgroupBarrier();
     for (var k: u32 = 0u; k < TILE_SIZE && w+k < total_sequence_length; k++) {
       value += tileQ[TILE_SIZE * local_id.y + k] * tileV[TILE_SIZE * k + local_id.x];
     }
     workgroupBarrier();
   }

   // we need to transpose output from BNSH_v to BSND_v
   if (m < uniforms.M && n < uniforms.N) {
     let outputIdx = batchIdx * uniforms.M * uniforms.v_hidden_size + m * uniforms.v_hidden_size
       + headIdx * uniforms.N + n;
     output[outputIdx] = value;
   }
  }`};return{name:"AttentionScore",shaderCache:{hint:`${n!==void 0};${e}`,inputDependencies:S},getRunData:()=>({outputs:T,dispatchGroup:x,programUniforms:$}),getShaderSource:I}},fr=(e,t,r,n,a,i,s,u,d,l,f=void 0,c=void 0)=>{let h=Math.min(e.outputCount,1+(s?1:0)+(u?1:0)),g=h>1?l.pastSequenceLength:0,y=g+l.kvSequenceLength,b=d&&z.size(d.dims)>0?d:void 0,x=[t,r];h>1&&s&&z.size(s.dims)>0&&x.push(s),b&&x.push(b),f&&x.push(f),c&&x.push(c);let $=e.compute(Ao(h,t,r,s,b,l,g,f,c),{inputs:x,outputs:h>1?[-1,1]:[-1]})[0];e.compute(zo($,l.batchSize,l.numHeads,g,l.sequenceLength,y,f,c),{inputs:f&&c?[$,f,c]:[$],outputs:[]});let w=[$,n];h>1&&u&&z.size(u.dims)>0&&w.push(u),f&&w.push(f),c&&w.push(c),e.compute(Oo(h,$,n,u,l,g,f,c),{inputs:w,outputs:h>1?[0,2]:[0]})},Bo=(e,t)=>{let r=[t.batchSize,t.numHeads,t.sequenceLength,t.headSize],n=t.sequenceLength,a=t.inputHiddenSize,i=t.headSize,s=12,u={x:Math.ceil(t.headSize/s),y:Math.ceil(t.sequenceLength/s),z:t.batchSize*t.numHeads},d=[e.inputs[0],e.inputs[1],e.inputs[2]],l=[{type:12,data:n},{type:12,data:a},{type:12,data:i},{type:12,data:t.numHeads},{type:12,data:t.headSize},{type:12,data:t.hiddenSize},{type:12,data:t.hiddenSize+t.hiddenSize+t.vHiddenSize}],f=c=>{let h=H("output_q",d[0].dataType,r),g=H("output_k",d[0].dataType,r),y=H("output_v",d[0].dataType,r),b=R("input",d[0].dataType,d[0].dims),x=R("weight",d[1].dataType,d[1].dims),$=R("bias",d[2].dataType,d[2].dims),w=b.type.storage,S=[{name:"M",type:"u32"},{name:"K",type:"u32"},{name:"N",type:"u32"},{name:"num_heads",type:"u32"},{name:"head_size",type:"u32"},{name:"hidden_size",type:"u32"},{name:"ldb",type:"u32"}];return`
  const TILE_SIZE = ${s}u;
  var<workgroup> tileInput: array<${w}, ${s*s}>;
  var<workgroup> tileWeightQ: array<${w}, ${s*s}>;
  var<workgroup> tileWeightK: array<${w}, ${s*s}>;
  var<workgroup> tileWeightV: array<${w}, ${s*s}>;
  ${c.registerUniforms(S).declareVariables(b,x,$,h,g,y)}
  ${c.mainStart([s,s,1])}
    let batchIndex = workgroup_id.z / uniforms.num_heads;
    let headNumber = workgroup_id.z % uniforms.num_heads;
    let m = global_id.y;
    let n = global_id.x;

    let inputOffset = batchIndex * (uniforms.M * uniforms.K) + m * uniforms.K;
    let biasOffsetQ = headNumber * uniforms.head_size;
    let biasOffsetK = uniforms.hidden_size + biasOffsetQ;
    let biasOffsetV = uniforms.hidden_size + biasOffsetK;

    var valueQ = ${w}(0);
    var valueK = ${w}(0);
    var valueV = ${w}(0);
    for (var w: u32 = 0u; w < uniforms.K; w += TILE_SIZE) {
      if (m < uniforms.M && w + local_id.x < uniforms.K) {
        tileInput[TILE_SIZE * local_id.y + local_id.x] = input[inputOffset + w + local_id.x];
      }
      if (n < uniforms.N && w + local_id.y < uniforms.K) {
        let offset = n + (w + local_id.y) * uniforms.ldb;
        tileWeightQ[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetQ + offset];
        tileWeightK[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetK + offset];
        tileWeightV[TILE_SIZE * local_id.y + local_id.x] = weight[biasOffsetV + offset];
      }
      workgroupBarrier();
      for (var k: u32 = 0u; k<TILE_SIZE && w+k < uniforms.K; k++) {
        let inputTileOffset = TILE_SIZE * local_id.y + k;
        let weightTileOffset = TILE_SIZE * k + local_id.x;
        valueQ += tileInput[inputTileOffset] * tileWeightQ[weightTileOffset];
        valueK += tileInput[inputTileOffset] * tileWeightK[weightTileOffset];
        valueV += tileInput[inputTileOffset] * tileWeightV[weightTileOffset];
      }

      workgroupBarrier();
    }

    let headOffset = (m * uniforms.N + n) % uniforms.head_size;
    valueQ += bias[headOffset + biasOffsetQ];
    valueK += bias[headOffset + biasOffsetK];
    valueV += bias[headOffset + biasOffsetV];

    let offset = workgroup_id.z * uniforms.M * uniforms.N;
    if (m < uniforms.M && n < uniforms.N) {
      let outputIdx = offset + m * uniforms.N + n;
      output_q[outputIdx] = valueQ;
      output_k[outputIdx] = valueK;
      output_v[outputIdx] = valueV;
    }
  }`};return e.compute({name:"AttentionPrepare",shaderCache:{inputDependencies:["type","type","type"]},getRunData:()=>({outputs:[{dims:r,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:r,dataType:e.inputs[0].dataType,gpuDataType:0},{dims:r,dataType:e.inputs[0].dataType,gpuDataType:0}],dispatchGroup:u,programUniforms:l}),getShaderSource:f},{inputs:d,outputs:[-1,-1,-1]})},_p=(e,t)=>{let r=Co(e.inputs,t),[n,a,i]=Bo(e,r);return fr(e,n,a,i,e.inputs[4],void 0,void 0,void 0,e.inputs[5],r)}}),Ro,Do,No,bp,ag=U(()=>{Qe(),J(),re(),$e(),ie(),Ro=(e,t)=>{if(!e||e.length!==5)throw new Error("BatchNormalization requires 5 inputs");let r=(n,a,i)=>{let s=a.length;if(s!==n.length)throw new Error(`${i}: num dimensions != ${s}`);a.forEach((u,d)=>{if(u!==n[d])throw new Error(`${i}: dim[${d}] do not match`)})};if(e[0].dims.length>1){let n=t.format==="NHWC"?t.spatial?e[0].dims.slice(-1):e[0].dims.slice(-1).concat(e[0].dims.slice(1,e[0].dims.length-1)):e[0].dims.slice(1,t.spatial?2:void 0);r(e[1].dims,n,"Invalid input scale"),r(e[2].dims,n,"Invalid input B"),r(e[3].dims,n,"Invalid input mean"),r(e[4].dims,n,"Invalid input var")}else r(e[1].dims,[1],"Invalid input scale"),r(e[2].dims,[1],"Invalid input B"),r(e[3].dims,[1],"Invalid input mean"),r(e[4].dims,[1],"Invalid input var")},Do=(e,t)=>{let{epsilon:r,spatial:n,format:a}=t,i=e[0].dims,s=n?we(i[i.length-1]):1,u=a==="NHWC"&&i.length>1?s:1,d=z.size(i)/s,l=n,f=l?i.length:i,c=R("x",e[0].dataType,e[0].dims,s),h=R("scale",e[1].dataType,e[1].dims,u),g=R("bias",e[2].dataType,e[2].dims,u),y=R("inputMean",e[3].dataType,e[3].dims,u),b=R("inputVar",e[4].dataType,e[4].dims,u),x=H("y",e[0].dataType,f,s),$=()=>{let S="";if(n)S=`let cOffset = ${i.length===1?"0u":a==="NHWC"?`outputIndices[${i.length-1}] / ${s}`:"outputIndices[1]"};`;else if(a==="NCHW")S=`
            ${x.indicesSet("outputIndices","0","0")}
            let cOffset = ${x.indicesToOffset("outputIndices")};`;else{S=`var cIndices = ${h.type.indices}(0);
                       cIndices[0] = outputIndices[${i.length-1}];`;for(let T=1;T<h.rank;T++)S+=`cIndices[${T}] = outputIndices[${T}];`;S+=`let cOffset = ${h.indicesToOffset("cIndices")};`}return S},w=S=>`
  const epsilon = ${r};
  ${S.registerUniform("outputSize","u32").declareVariables(c,h,g,y,b,x)}
  ${S.mainStart()}
  ${S.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
    var outputIndices = ${x.offsetToIndices(`global_idx * ${s}`)};
    ${$()}
    let scale = ${h.getByOffset("cOffset")};
    let bias = ${g.getByOffset("cOffset")};
    let inputMean = ${y.getByOffset("cOffset")};
    let inputVar = ${b.getByOffset("cOffset")};
    let x = ${c.getByOffset("global_idx")};
    let value = (x - inputMean) * inverseSqrt(inputVar + epsilon) * scale + bias;
    ${x.setByOffset("global_idx","value")}
  }`;return{name:"BatchNormalization",shaderCache:{hint:`${t.epsilon}_${t.format}_${n}_${s}`,inputDependencies:l?["rank","type","type","type","type"]:void 0},getShaderSource:w,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:l?[{type:12,data:d},...Z(i)]:[{type:12,data:d}]})}},No=e=>fe(e),bp=(e,t)=>{let{inputs:r,outputCount:n}=e,a=No({...t,outputCount:n});if(_e.webgpu.validateInputContent&&Ro(r,a),t.trainingMode)throw new Error("BatchNormalization trainingMode is not supported yet.");e.compute(Do(r,a))}}),Mo,Po,wp,sg=U(()=>{re(),ie(),Mo=e=>{if(e[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![320,640,1280].includes(e[0].dims[2]))throw new Error("number of channels should be 320, 640 or 1280");if(e[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(e[0].dims[2]!==e[1].dims[0])throw new Error("last dimension of input and bias are not the same")},Po=e=>{let t=e[0].dims,r=e[0].dims[2],n=z.size(t)/4,a=e[0].dataType,i=R("input",a,t,4),s=R("bias",a,[r],4),u=R("residual",a,t,4),d=H("output",a,t,4);return{name:"BiasAdd",getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(n/64)}}),getShaderSource:l=>`
  const channels = ${r}u / 4;
  ${l.declareVariables(i,s,u,d)}

  ${l.mainStart()}
    ${l.guardAgainstOutOfBoundsWorkgroupSizes(n)}
    let value = ${i.getByOffset("global_idx")}
      + ${s.getByOffset("global_idx % channels")} + ${u.getByOffset("global_idx")};
    ${d.setByOffset("global_idx","value")}
  }`}},wp=e=>{Mo(e.inputs),e.compute(Po(e.inputs))}}),Uo,pe,$p,vp,xp,Tp,Sp,Ip,kp,Ep,Cp,Wo,zp,Ap,Op,Bp,or,Rp,Lr,Dp,Np,Mp,Pp,Up,Wp,Lp,qp,Vp,jp,Gp,Hp,Fp,Kp,Zp,Qp,Ui,Xp,In,kn,Yp,Jp,ef,Lo,qo,tf,Yn=U(()=>{J(),re(),$e(),ie(),Uo=(e,t,r,n,a,i,s)=>{let u=Math.ceil(t/4),d="";typeof a=="string"?d=`${a}(a)`:d=a("a");let l=R("inputData",r,[u],4),f=H("outputData",n,[u],4),c=[{name:"vec_size",type:"u32"}];return s&&c.push(...s),`
      ${e.registerUniforms(c).declareVariables(l,f)}

  ${i??""}

  ${e.mainStart()}
    ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}

    let a = ${l.getByOffset("global_idx")};
    ${f.setByOffset("global_idx",d)}
  }`},pe=(e,t,r,n,a,i=e.dataType,s,u)=>{let d=[{type:12,data:Math.ceil(z.size(e.dims)/4)}];return s&&d.push(...s),{name:t,shaderCache:{hint:a,inputDependencies:["type"]},getShaderSource:l=>Uo(l,z.size(e.dims),e.dataType,i,r,n,u),getRunData:l=>({outputs:[{dims:e.dims,dataType:i}],dispatchGroup:{x:Math.ceil(z.size(l[0].dims)/64/4)},programUniforms:d})}},$p=e=>{e.compute(pe(e.inputs[0],"Abs","abs"))},vp=e=>{e.compute(pe(e.inputs[0],"Acos","acos"))},xp=e=>{e.compute(pe(e.inputs[0],"Acosh","acosh"))},Tp=e=>{e.compute(pe(e.inputs[0],"Asin","asin"))},Sp=e=>{e.compute(pe(e.inputs[0],"Asinh","asinh"))},Ip=e=>{e.compute(pe(e.inputs[0],"Atan","atan"))},kp=e=>{e.compute(pe(e.inputs[0],"Atanh","atanh"))},Ep=e=>fe(e),Cp=(e,t)=>{let r;switch(t.to){case 10:r="vec4<f16>";break;case 1:r="vec4<f32>";break;case 12:r="vec4<u32>";break;case 6:r="vec4<i32>";break;case 9:r="vec4<bool>";break;default:throw new RangeError(`not supported type (specified in attribute 'to' from 'Cast' operator): ${t.to}`)}e.compute(pe(e.inputs[0],"Cast",r,void 0,t.cacheKey,t.to))},Wo=e=>{let t,r,n=e.length>=2&&e[1].data!==0,a=e.length>=3&&e[2].data!==0;switch(e[0].dataType){case 1:t=n?e[1].getFloat32Array()[0]:-34028234663852886e22,r=a?e[2].getFloat32Array()[0]:34028234663852886e22;break;case 10:t=n?e[1].getUint16Array()[0]:64511,r=a?e[2].getUint16Array()[0]:31743;break;default:throw new Error("Unsupport data type")}return fe({min:t,max:r})},zp=(e,t)=>{let r=t||Wo(e.inputs),n=Ee(e.inputs[0].dataType);e.compute(pe(e.inputs[0],"Clip",a=>`clamp(${a}, vec4<${n}>(uniforms.min), vec4<${n}>(uniforms.max))`,void 0,r.cacheKey,void 0,[{type:e.inputs[0].dataType,data:r.min},{type:e.inputs[0].dataType,data:r.max}],[{name:"min",type:n},{name:"max",type:n}]),{inputs:[0]})},Ap=e=>{e.compute(pe(e.inputs[0],"Ceil","ceil"))},Op=e=>{e.compute(pe(e.inputs[0],"Cos","cos"))},Bp=e=>{e.compute(pe(e.inputs[0],"Cosh","cosh"))},or=e=>fe(e),Rp=(e,t)=>{let r=Ee(e.inputs[0].dataType);e.compute(pe(e.inputs[0],"Elu",n=>`elu_vf32(${n})`,`
  const elu_alpha_ = ${r}(${t.alpha});

  fn elu_f32(a: ${r}) -> ${r} {
  return select((exp(a) - 1.0) * elu_alpha_, a, a >= 0.0);
  }

  fn elu_vf32(v: vec4<${r}>) -> vec4<${r}> {
  return vec4(elu_f32(v.x), elu_f32(v.y), elu_f32(v.z), elu_f32(v.w));
  }`,t.cacheKey))},Lr=(e="f32")=>`
const r0: ${e} = 0.3275911;
const r1: ${e} = 0.254829592;
const r2: ${e} = -0.284496736;
const r3: ${e} = 1.421413741;
const r4: ${e} = -1.453152027;
const r5: ${e} = 1.061405429;

fn erf_vf32(v: vec4<${e}>) -> vec4<${e}> {
  let absv = abs(v);
  let x = 1.0 / (1.0 + r0 * absv);
  return sign(v) * (1.0 - ((((r5 * x + r4) * x + r3) * x + r2) * x + r1) * x * exp(-absv * absv));
}`,Dp=e=>{let t=Ee(e.inputs[0].dataType);e.compute(pe(e.inputs[0],"Erf",r=>`erf_vf32(${r})`,Lr(t)))},Np=e=>{e.compute(pe(e.inputs[0],"Exp","exp"))},Mp=e=>{e.compute(pe(e.inputs[0],"Floor","floor"))},Pp=e=>{let t=Ee(e.inputs[0].dataType);e.compute(pe(e.inputs[0],"Gelu",r=>`0.5 * ${r} * (1.0 + erf_vf32(${r} * 0.7071067811865475))`,Lr(t)))},Up=(e,t)=>{let r=Ee(e.inputs[0].dataType);e.compute(pe(e.inputs[0],"LeakyRelu",n=>`select(leaky_relu_alpha_ * ${n}, ${n}, ${n} >= vec4<${r}>(0.0))`,`const leaky_relu_alpha_ = ${r}(${t.alpha});`,t.cacheKey))},Wp=e=>{e.compute(pe(e.inputs[0],"Not",t=>`!${t}`))},Lp=e=>{e.compute(pe(e.inputs[0],"Neg",t=>`-${t}`))},qp=e=>{e.compute(pe(e.inputs[0],"Reciprocal",t=>`1.0/${t}`))},Vp=e=>{let t=Ee(e.inputs[0].dataType);e.compute(pe(e.inputs[0],"Relu",r=>`select(vec4<${t}>(0.0), ${r}, ${r} > vec4<${t}>(0.0))`))},jp=e=>{e.compute(pe(e.inputs[0],"Sigmoid",t=>`(1.0 / (1.0 + exp(-${t})))`))},Gp=e=>fe(e),Hp=(e,t)=>{let r=Ee(e.inputs[0].dataType);e.compute(pe(e.inputs[0],"HardSigmoid",n=>`max(vec4<${r}>(0.0), min(vec4<${r}>(1.0), ${t.alpha} * ${n} + vec4<${r}>(${t.beta})))`,void 0,t.cacheKey))},Fp=e=>{e.compute(pe(e.inputs[0],"Sin","sin"))},Kp=e=>{e.compute(pe(e.inputs[0],"Sinh","sinh"))},Zp=e=>{e.compute(pe(e.inputs[0],"Sqrt","sqrt"))},Qp=e=>{e.compute(pe(e.inputs[0],"Tan","tan"))},Ui=e=>`sign(${e}) * (1 - exp(-2 * abs(${e}))) / (1 + exp(-2 * abs(${e})))`,Xp=e=>{e.compute(pe(e.inputs[0],"Tanh",Ui))},In=(e="f32")=>`
const fast_gelu_a: ${e} = 0.5;
const fast_gelu_b: ${e} = 0.7978845608028654;
const fast_gelu_c: ${e} = 0.035677408136300125;

fn tanh_v(v: vec4<${e}>) -> vec4<${e}> {
  return ${Ui("v")};
}
`,kn=e=>`(fast_gelu_a + fast_gelu_a * tanh_v(${e} * (fast_gelu_c * ${e} * ${e} + fast_gelu_b))) * ${e}`,Yp=e=>{let t=Ee(e.inputs[0].dataType);e.compute(pe(e.inputs[0],"FastGelu",kn,In(t),void 0,e.inputs[0].dataType))},Jp=(e,t)=>{let r=Ee(e.inputs[0].dataType);return e.compute(pe(e.inputs[0],"ThresholdedRelu",n=>`select(vec4<${r}>(0.0), ${n}, ${n} > thresholded_relu_alpha_)`,`const thresholded_relu_alpha_ = vec4<${r}>(${t.alpha});`,t.cacheKey)),0},ef=e=>{e.compute(pe(e.inputs[0],"Log","log"))},Lo=(e,t)=>`
const alpha = vec4<${e}>(${t});
const one = ${e}(1.0);
const zero = ${e}(0.0);

fn quick_gelu_impl(x: vec4<${e}>) -> vec4<${e}> {
  let v = x *alpha;
  var x1 : vec4<${e}>;
  for (var i = 0; i < 4; i = i + 1) {
    if (v[i] >= zero) {
      x1[i] = one / (one + exp(-v[i]));
    } else {
      x1[i] = one - one / (one + exp(v[i]));
    }
  }
  return x * x1;
}
`,qo=e=>`quick_gelu_impl(${e})`,tf=(e,t)=>{let r=Ee(e.inputs[0].dataType);e.compute(pe(e.inputs[0],"QuickGelu",qo,Lo(r,t.alpha),t.cacheKey,e.inputs[0].dataType))}}),Vo,jo,rf,og=U(()=>{re(),ie(),Yn(),Vo=e=>{if(e[0].dims.length!==3)throw new Error("input should have 3 dimensions");if(![2560,5120,10240].includes(e[0].dims[2]))throw new Error("hidden state should be 2560, 5120 or 10240");if(e[1].dims.length!==1)throw new Error("bias is expected to have 1 dimensions");if(e[0].dims[2]!==e[1].dims[0])throw new Error("last dimension of input and bias are not the same")},jo=e=>{let t=e[0].dims.slice();t[2]=t[2]/2;let r=R("input",e[0].dataType,e[0].dims,4),n=R("bias",e[0].dataType,[e[0].dims[2]],4),a=H("output",e[0].dataType,t,4),i=z.size(t)/4,s=Te(e[0].dataType);return{name:"BiasSplitGelu",getRunData:()=>({outputs:[{dims:t,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(i/64)}}),getShaderSource:u=>`
  const M_SQRT2 = sqrt(2.0);
  const halfChannels = ${e[0].dims[2]/4/2}u;

  ${u.declareVariables(r,n,a)}

  ${Lr(s)}

  ${u.mainStart()}
    ${u.guardAgainstOutOfBoundsWorkgroupSizes(i)}
    let biasIdx = global_idx % halfChannels;
    let batchIndex = global_idx / halfChannels;
    let inputOffset = biasIdx + batchIndex * halfChannels * 2;
    let valueLeft = input[inputOffset] + bias[biasIdx];
    let valueRight = input[inputOffset + halfChannels] + bias[biasIdx + halfChannels];
    let geluRight = valueRight * 0.5 * (erf_vf32(valueRight / M_SQRT2) + 1);

    ${a.setByOffset("global_idx","valueLeft * geluRight")}
  }`}},rf=e=>{Vo(e.inputs),e.compute(jo(e.inputs))}}),Go,Ho,Ge,nf,af,sf,of,uf,lf,df,pf,ff,cf,ug=U(()=>{J(),re(),ie(),Go=(e,t,r,n,a,i,s,u,d,l,f,c)=>{let h,g;typeof u=="string"?h=g=(w,S)=>`${u}((${w}),(${S}))`:typeof u=="function"?h=g=u:(h=u.scalar,g=u.vector);let y=H("outputData",f,n.length,4),b=R("aData",d,t.length,4),x=R("bData",l,r.length,4),$;if(a)if(i){let w=z.size(t)===1,S=z.size(r)===1,T=t.length>0&&t[t.length-1]%4===0,I=r.length>0&&r[r.length-1]%4===0;w||S?$=y.setByOffset("global_idx",g(w?`${b.type.value}(${b.getByOffset("0")}.x)`:b.getByOffset("global_idx"),S?`${x.type.value}(${x.getByOffset("0")}.x)`:x.getByOffset("global_idx"))):$=`
            let outputIndices = ${y.offsetToIndices("global_idx * 4u")};
            let offsetA = ${b.broadcastedIndicesToOffset("outputIndices",y)};
            let offsetB = ${x.broadcastedIndicesToOffset("outputIndices",y)};
            ${y.setByOffset("global_idx",g(s||T?b.getByOffset("offsetA / 4u"):`${b.type.value}(${b.getByOffset("offsetA / 4u")}[offsetA % 4u])`,s||I?x.getByOffset("offsetB / 4u"):`${x.type.value}(${x.getByOffset("offsetB / 4u")}[offsetB % 4u])`))}
          `}else $=y.setByOffset("global_idx",g(b.getByOffset("global_idx"),x.getByOffset("global_idx")));else{if(!i)throw new Error("no necessary to use scalar implementation for element-wise binary op implementation.");let w=(S,T,I="")=>{let E=`aData[indexA${T}][componentA${T}]`,C=`bData[indexB${T}][componentB${T}]`;return`
            let outputIndices${T} = ${y.offsetToIndices(`global_idx * 4u + ${T}u`)};
            let offsetA${T} = ${b.broadcastedIndicesToOffset(`outputIndices${T}`,y)};
            let offsetB${T} = ${x.broadcastedIndicesToOffset(`outputIndices${T}`,y)};
            let indexA${T} = offsetA${T} / 4u;
            let indexB${T} = offsetB${T} / 4u;
            let componentA${T} = offsetA${T} % 4u;
            let componentB${T} = offsetB${T} % 4u;
            ${S}[${T}] = ${I}(${h(E,C)});
          `};f===9?$=`
            var data = vec4<u32>(0);
            ${w("data",0,"u32")}
            ${w("data",1,"u32")}
            ${w("data",2,"u32")}
            ${w("data",3,"u32")}
            outputData[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:$=`
            ${w("outputData[global_idx]",0)}
            ${w("outputData[global_idx]",1)}
            ${w("outputData[global_idx]",2)}
            ${w("outputData[global_idx]",3)}
          `}return`
        ${e.registerUniform("vec_size","u32").declareVariables(b,x,y)}

        ${c??""}

        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
        ${$}
      }`},Ho=(e,t,r,n,a,i,s=r.dataType)=>{let u=r.dims.map(b=>Number(b)??1),d=n.dims.map(b=>Number(b)??1),l=!z.areEqual(u,d),f=u,c=z.size(u),h=!1,g=!1,y=[l];if(l){let b=Lt.calcShape(u,d,!1);if(!b)throw new Error("Can't perform binary op on the given tensors");f=b.slice(),c=z.size(f);let x=z.size(u)===1,$=z.size(d)===1,w=u.length>0&&u[u.length-1]%4===0,S=d.length>0&&d[d.length-1]%4===0;y.push(x),y.push($),y.push(w),y.push(S);let T=1;for(let I=1;I<f.length;I++){let E=u[u.length-I],C=d[d.length-I];if(E===C)T*=E;else break}T%4===0?(g=!0,h=!0):(x||$||w||S)&&(h=!0)}else h=!0;return y.push(h),{name:e,shaderCache:{hint:t+y.map(b=>b.toString()).join("_"),inputDependencies:["rank","rank"]},getShaderSource:b=>Go(b,u,d,f,h,l,g,a,r.dataType,n.dataType,s,i),getRunData:()=>({outputs:[{dims:f,dataType:s}],dispatchGroup:{x:Math.ceil(c/64/4)},programUniforms:[{type:12,data:Math.ceil(z.size(f)/4)},...Z(u,d,f)]})}},Ge=(e,t,r,n,a,i)=>{e.compute(Ho(t,a??"",e.inputs[0],e.inputs[1],r,n,i))},nf=e=>{Ge(e,"Add",(t,r)=>`${t}+${r}`)},af=e=>{Ge(e,"Div",(t,r)=>`${t}/${r}`)},sf=e=>{Ge(e,"Equal",{scalar:(t,r)=>`u32(${t}==${r})`,vector:(t,r)=>`vec4<u32>(${t}==${r})`},void 0,void 0,9)},of=e=>{Ge(e,"Mul",(t,r)=>`${t}*${r}`)},uf=e=>{let t=R("input",e.inputs[0].dataType,e.inputs[0].dims).type.value;Ge(e,"Pow",{scalar:(r,n)=>`pow_custom(${r},${n})`,vector:(r,n)=>`pow_vector_custom(${r},${n})`},`
    fn pow_custom(a : ${t}, b : ${t}) -> ${t} {
      if (b == ${t}(0.0)) {
        return ${t}(1.0);
      } else if (a < ${t}(0.0) && f32(b) != floor(f32(b))) {
        return ${t}(pow(f32(a), f32(b))); // NaN
      }
      return select(sign(a), ${t}(1.0), round(f32(abs(b) % ${t}(2.0))) != 1.0) * ${t}(${t==="i32"?"round":""}(pow(f32(abs(a)), f32(b))));
    }
    fn pow_vector_custom(a : vec4<${t}>, b : vec4<${t}>) -> vec4<${t}> {
      // TODO: implement vectorized pow
      return vec4<${t}>(pow_custom(a.x, b.x), pow_custom(a.y, b.y), pow_custom(a.z, b.z), pow_custom(a.w, b.w));
    }
      `)},lf=e=>{Ge(e,"Sub",(t,r)=>`${t}-${r}`)},df=e=>{Ge(e,"Greater",{scalar:(t,r)=>`u32(${t}>${r})`,vector:(t,r)=>`vec4<u32>(${t}>${r})`},void 0,void 0,9)},pf=e=>{Ge(e,"Less",{scalar:(t,r)=>`u32(${t}<${r})`,vector:(t,r)=>`vec4<u32>(${t}<${r})`},void 0,void 0,9)},ff=e=>{Ge(e,"GreaterOrEqual",{scalar:(t,r)=>`u32(${t}>=${r})`,vector:(t,r)=>`vec4<u32>(${t}>=${r})`},void 0,void 0,9)},cf=e=>{Ge(e,"LessOrEqual",{scalar:(t,r)=>`u32(${t}<=${r})`,vector:(t,r)=>`vec4<u32>(${t}<=${r})`},void 0,void 0,9)}}),Fo,Ko,Zo,Qo,hf,mf,lg=U(()=>{J(),re(),$e(),ie(),Fo=(e,t)=>{if(!e||e.length<1)throw new Error("too few inputs");let r=0,n=e[r],a=n.dataType,i=n.dims.length;e.forEach((s,u)=>{if(u!==r){if(s.dataType!==a)throw new Error("input tensors should be one type");if(s.dims.length!==i)throw new Error("input tensors should have the same shape");s.dims.forEach((d,l)=>{if(l!==t&&d!==n.dims[l])throw new Error("non concat dimensions must match")})}})},Ko=(e,t)=>`
  fn calculateInputIndex(index: u32) -> u32 {
    let sizeInConcatAxis = array<u32, ${e}u>(${t});
    for (var i: u32 = 0u; i < ${e}; i += 1u ) {
      if (index < sizeInConcatAxis[i]) {
        return i;
      }
    }
    return ${e}u;
  }`,Zo=(e,t)=>{let r=e.length,n=[];for(let a=0;a<r;++a){let i=t.setByOffset("global_idx",e[a].getByIndices("indices"));r===1?n.push(i):a===0?n.push(`if (inputIndex == ${a}u) { ${i} }`):a===r-1?n.push(`else { ${i} }`):n.push(`else if (inputIndex == ${a}) { ${i} }`)}return n.join(`
`)},Qo=(e,t,r,n)=>{let a=z.size(r),i=new Array(e.length),s=new Array(e.length),u=0,d=[],l=[],f=[{type:12,data:a}];for(let b=0;b<e.length;++b)u+=e[b].dims[t],i[b]=u,l.push(e[b].dims.length),s[b]=R(`input${b}`,n,l[b]),d.push("rank"),f.push({type:12,data:i[b]});for(let b=0;b<e.length;++b)f.push(...Z(e[b].dims));f.push(...Z(r));let c=H("output",n,r.length),h=c.indicesGet("indices",t),g=Array.from(Array(i.length).keys()).map(b=>`uniforms.sizeInConcatAxis${b}`).join(","),y=b=>`

  ${(()=>{b.registerUniform("outputSize","u32");for(let x=0;x<e.length;x++)b.registerUniform(`sizeInConcatAxis${x}`,"u32");return b.declareVariables(...s,c)})()}

  ${Ko(i.length,g)}

  ${b.mainStart()}
    ${b.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

    var indices = ${c.offsetToIndices("global_idx")};

    let inputIndex = calculateInputIndex(${h});
    if (inputIndex != 0u) {
      let sizeInConcatAxis = array<u32, ${i.length}u>(${g});
      ${h} -= sizeInConcatAxis[inputIndex - 1u];
    }

    ${Zo(s,c)}
  }`;return{name:"Concat",shaderCache:{hint:`${t}`,inputDependencies:d},getRunData:()=>({outputs:[{dims:r,dataType:n}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:f}),getShaderSource:y}},hf=(e,t)=>{let r=e.inputs,n=r[0].dims,a=z.normalizeAxis(t.axis,n.length);Fo(r,a);let i=n.slice();i[a]=r.reduce((u,d)=>u+(d.dims.length>a?d.dims[a]:0),0);let s=r.filter(u=>z.size(u.dims)>0);e.compute(Qo(s,a,i,r[0].dataType),{inputs:s})},mf=e=>fe({axis:e.axis})}),Ct,zt,At,Jn,Bt=U(()=>{J(),re(),Ct=(e,t,r="f32")=>{switch(e.activation){case"Relu":return`value = max(value, ${t}(0.0));`;case"Sigmoid":return`value = (${t}(1.0) / (${t}(1.0) + exp(-value)));`;case"Clip":return`value = clamp(value, ${t}(${r}(uniforms.clip_min)), ${t}(${r}(uniforms.clip_max)));`;case"HardSigmoid":return`value = max(${t}(0.0), min(${t}(1.0), ${r}(uniforms.alpha) * value + ${r}(uniforms.beta)));`;case"LeakyRelu":return`value = select(${r}(uniforms.alpha) * value, value, value >= ${t}(0.0));`;case"Tanh":return`let e2x = exp(-2.0 * abs(value));
              value = sign(value) * (1.0 - e2x) / (1.0 + e2x);
        `;case"":return"";default:throw new Error(`Unsupported activation ${e.activation}`)}},zt=(e,t)=>{e.activation==="Clip"?t.push({type:1,data:e.clipMax},{type:1,data:e.clipMin}):e.activation==="HardSigmoid"?t.push({type:1,data:e.alpha},{type:1,data:e.beta}):e.activation==="LeakyRelu"&&t.push({type:1,data:e.alpha})},At=(e,t)=>{e.activation==="Clip"?t.push({name:"clip_max",type:"f32"},{name:"clip_min",type:"f32"}):e.activation==="HardSigmoid"?t.push({name:"alpha",type:"f32"},{name:"beta",type:"f32"}):e.activation==="LeakyRelu"&&t.push({name:"alpha",type:"f32"})},Jn=e=>{let t=(e==null?void 0:e.activation)||"";if(t==="HardSigmoid"){let[r,n]=(e==null?void 0:e.activation_params)||[.2,.5];return{activation:t,alpha:r,beta:n}}else if(t==="Clip"){let[r,n]=(e==null?void 0:e.activation_params)||[Wd,Ld];return{activation:t,clipMax:n,clipMin:r}}else if(t==="LeakyRelu"){let[r]=(e==null?void 0:e.activation_params)||[.01];return{activation:t,alpha:r}}return{activation:t}}}),Ie,gf,ea=U(()=>{Ie=(e,t)=>{switch(e){case 1:return t;case 2:return`vec2<${t}>`;case 3:return`vec3<${t}>`;case 4:return`vec4<${t}>`;default:throw new Error(`${e}-component is not supported.`)}},gf=e=>`
      ${e?"value = value + getBiasByOutputCoords(coords);":""}
      `}),yf,dg=U(()=>{yf=e=>`
fn getIndexFromCoords4D(coords : vec4<i32>, shape : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
      shape.y * shape.z * shape.w, shape.z * shape.w, shape.w, 1));
}
fn getOutputIndexFromCoords(coords : vec4<i32>) -> i32 {
  return dot(coords, vec4<i32>(
    i32(${e}.x), i32(${e}.y), i32(${e}.z), 1));
}
`}),lr,ta,ra=U(()=>{J(),re(),ie(),Bt(),lr=(e,t,r,n,a)=>{let i=n-r;return`
      ${Array.from({length:r}).map((s,u)=>`
      if (${F(t.shape,u,t.rank)} != 1) {
        ${t.indicesSet(e,u,F(a,u+i,n))}
      } else {
        ${t.indicesSet(e,u,0)}
      }`).join("")}
`},ta=(e,t,r,n,a=!1,i)=>{let s=e[0].dims,u=e[1].dims,d=s[s.length-2],l=u[u.length-1],f=s[s.length-1],c=we(l),h=we(f),g=we(d),y=z.size(r)/c/g,b=e.length>2,x=n?n.slice(0,-2):r.slice(0,-2),$=[z.size(x),d,l],w=[{type:12,data:y},{type:12,data:d},{type:12,data:l},{type:12,data:f}];zt(t,w),w.push(...Z(x,s,u)),b&&w.push(...Z(e[2].dims)),w.push(...Z($));let S=T=>{let I=Zn("batch_dims",e[0].dataType,x.length),E=R("a",e[0].dataType,s.length,h),C=R("b",e[1].dataType,u.length,c),A=H("output",e[0].dataType,$.length,c),O=Te(A.type.tensor),W=Ct(t,A.type.value,O),X=[E,C],G="";if(b){let te=a?c:1;X.push(R("bias",e[2].dataType,e[2].dims.length,te)),G=`${a?`value += bias[col / ${te}];`:`value += ${A.type.value}(bias[row + i]);`}`}let Q=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"}];At(t,Q);let oe=()=>{let te=`var a_data: ${E.type.value};`;for(let V=0;V<h;V++)te+=`
              let b_data${V} = b[(b_offset + (k + ${V}) * uniforms.N + col) / ${c}];`;for(let V=0;V<g;V++){te+=`a_data = a[(a_offset + (row + ${V}) * uniforms.K + k) / ${h}];`;for(let L=0;L<h;L++)te+=`
            values[${V}] = fma(${C.type.value}(a_data${h===1?"":`[${L}]`}), b_data${L}, values[${V}]);
`}return te};return`
  ${T.registerUniforms(Q).registerInternalVariables(I).declareVariables(...X,A)}
  ${T.mainStart()}
    ${T.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let col = (global_idx % (uniforms.N / ${c})) * ${c};
    var index1 = global_idx / (uniforms.N / ${c});
    let stride1 = uniforms.M / ${g};
    let row = (index1 % stride1) * ${g};
    let batch = index1 / stride1;

    ${r.length===2?"":`let batch_indices = ${I.offsetToIndices("batch")};`}

    var a_indices: ${E.type.indices};
    ${lr("a_indices",E,E.rank-2,I.rank,"batch_indices")}
    ${E.indicesSet("a_indices",E.rank-2,0)}
    ${E.indicesSet("a_indices",E.rank-1,0)}
    let a_offset = ${E.indicesToOffset("a_indices")};

    var b_indices: ${C.type.indices};
    ${lr("b_indices",C,C.rank-2,I.rank,"batch_indices")}
    ${C.indicesSet("b_indices",C.rank-2,0)}
    ${C.indicesSet("b_indices",C.rank-1,0)}
    let b_offset = ${C.indicesToOffset("b_indices")};
    var values: array<${A.type.value}, ${g}>;
    for (var k: u32 = 0u; k < uniforms.K; k = k + ${h}) {
      ${oe()}
    }
    for (var i = 0u; i < ${g}u; i++) {
      var value = values[i];
      ${G}
      ${W}
      let cur_indices = ${A.type.indices}(batch, row + i, col);
      let offset = ${A.indicesToOffset("cur_indices")};
      ${A.setByOffset(`offset / ${c}`,"value")};
    }
  }
  `};return{name:"MatMulNaive",shaderCache:{hint:`${t.activation};${c};${h};${g};${a}`,inputDependencies:b?["rank","rank","rank"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:i?i(r):r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(y/64)},programUniforms:w}),getShaderSource:S}}}),Xo,Yo,En,Wi,Jo,Cn,eu,Hr,ia=U(()=>{J(),re(),ie(),Bt(),ra(),ea(),Xo=(e,t)=>e?`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          kStart + inputRow,
          globalRowStart / innerElementSize + inputCol${t?", batchIndices":""});
        `:`
        mm_Asub[inputRow][inputCol] = mm_readA(batch,
          globalRow + innerRow,
          kStart / innerElementSize + inputCol${t?", batchIndices":""});
        `,Yo=(e,t)=>e?`
        let ACached0 = mm_Asub[k * innerElementSize][localRow];
        let ACached1 = mm_Asub[k * innerElementSize + 1][localRow];
        let ACached2 = mm_Asub[k * innerElementSize + 2][localRow];
        ${t===3?"":"let ACached3 = mm_Asub[k * innerElementSize + 3][localRow];"}
        for (var i = 0; i < rowPerThread; i = i + 1) {
          acc[i] = BCached0 * ACached0[i] + acc[i];
          acc[i] = BCached1 * ACached1[i] + acc[i];
          acc[i] = BCached2 * ACached2[i] + acc[i];
          ${t===3?"":"acc[i] = BCached3 * ACached3[i] + acc[i];"}
        }`:`
        for (var i = 0; i < rowPerThread; i = i + 1) {
          let ACached = mm_Asub[tileRow + i][k];
          acc[i] = BCached0 * ACached.x + acc[i];
          acc[i] = BCached1 * ACached.y + acc[i];
          acc[i] = BCached2 * ACached.z + acc[i];
          ${t===3?"":"acc[i] = BCached3 * ACached.w + acc[i];"}
        }`,En=(e,t,r="f32",n,a=!1,i=32,s=!1,u=32)=>{let d=t[1]*e[1],l=t[0]*e[0],f=a?d:i,c=a?i:d,h=f/t[0],g=i/t[1];if(!((a&&h===4&&e[1]===4||!a&&(h===3||h===4))&&f%t[0]===0&&i%t[1]===0&&e[0]===4))throw new Error(`If transposeA ${a} is true, innerElementSize ${h} and workPerThread[1] ${e[1]} must be 4.
      Otherwise, innerElementSize ${h} must be 3 or 4.
  tileAWidth ${f} must be divisible by workgroupSize[0]${t[0]}. tileInner ${i} must be divisible by workgroupSize[1] ${t[1]}. colPerThread ${e[0]} must be 4.`);return`
var<workgroup> mm_Asub: array<array<vec${h}<${r}>, ${f/h}>, ${c}>;
var<workgroup> mm_Bsub: array<array<vec4<${r}>, ${l/e[0]}>, ${i}>;

const rowPerThread = ${e[1]};
const colPerThread = ${e[0]};
const innerElementSize = ${h};
const tileInner = ${i};

@compute @workgroup_size(${t[0]}, ${t[1]}, ${t[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
  let localRow = i32(localId.y);
  let tileRow = localRow * rowPerThread;
  let tileCol = i32(localId.x);

  let globalRow =i32(globalId.y) * rowPerThread;
  let globalCol = i32(globalId.x);
  let batch = ${s?"0":"i32(globalId.z)"};
  ${n?`let batchIndices = ${n.offsetToIndices("u32(batch)")};`:""}
  let globalRowStart = i32(workgroupId.y) * ${d};

  let num_tiles = ${s?`${Math.ceil(u/i)}`:"(uniforms.dim_inner - 1) / tileInner + 1"};
  var kStart = ${s?`i32(globalId.z) * ${u}`:"0"};

  var acc: array<vec4<${r}>, rowPerThread>;

  // Loop over shared dimension.
  let tileRowB = localRow * ${g};
  for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let inputRow = tileRow + innerRow;
          let inputCol = tileCol;
          ${Xo(a,n)}
      }

      // Load one tile of B into local memory.
      for (var innerRow = 0; innerRow < ${g}; innerRow = innerRow + 1) {
          let inputRow = tileRowB + innerRow;
          let inputCol = tileCol;
          mm_Bsub[inputRow][inputCol] = mm_readB(batch, kStart + inputRow, globalCol${n?", batchIndices":""});
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      for (var k = 0; k < tileInner / innerElementSize; k = k + 1) {
          let BCached0 = mm_Bsub[k * innerElementSize][tileCol];
          let BCached1 = mm_Bsub[k * innerElementSize + 1][tileCol];
          let BCached2 = mm_Bsub[k * innerElementSize + 2][tileCol];
          ${h===3?"":"let BCached3 = mm_Bsub[k * innerElementSize + 3][tileCol];"}

          ${Yo(a,h)}
      }

      workgroupBarrier();
  }

  for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      mm_write(batch, globalRow + innerRow, globalCol, acc[innerRow]);
  }
}`},Wi=(e,t)=>e?`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              kStart + inputRow,
              globalRowStart + inputCol${t?", batchIndices":""});
            `:`
            mm_Asub[inputRow][inputCol] = mm_readA(batch,
              globalRowStart + inputRow,
              kStart + inputCol${t?", batchIndices":""});
            `,Jo=e=>e?"let ACached = mm_Asub[k][tileRow + innerRow];":"let ACached = mm_Asub[tileRow + innerRow][k];",Cn=(e,t,r="f32",n,a=!1,i=32,s=!1,u=32,d=!1)=>{let l=e[1]*t[1],f=e[0]*t[0],c=a?l:i,h=a?i:l;if(!(h%t[1]===0&&c%t[0]===0&&i%t[1]===0))throw new Error(`tileAHight ${h} must be divisible by workgroupSize[1]${t[1]}, tileAWidth ${c} must be divisible by workgroupSize[0]${t[0]}, tileInner ${i} must be divisible by workgroupSize[1]${t[1]}`);let g=h/t[1],y=c/t[0],b=i/t[1],x=d?`
    let localRow = i32(localId.y);
    let localCol = i32(localId.x);
    let globalRowStart = i32(workgroupId.y) * ${l};
    let globalColStart = i32(workgroupId.x) * ${f};

    // Loop over shared dimension.
    for (var t = 0; t < num_tiles; t = t + 1) {
      // Load one tile of A into local memory.
      for (var inputRow = localRow; inputRow < ${h}; inputRow = inputRow + ${t[1]}) {
        for (var inputCol = localCol; inputCol < ${c}; inputCol = inputCol + ${t[0]}) {
          ${Wi(a,n)}
        }
      }
      // Load one tile of B into local memory.
      for (var inputRow = localRow; inputRow < ${i}; inputRow = inputRow + ${t[1]}) {
            for (var inputCol = localCol; inputCol < ${f}; inputCol = inputCol + ${t[0]}) {
          mm_Bsub[inputRow][inputCol] = mm_readB(batch,
            kStart + inputRow,
            globalColStart + inputCol${n?", batchIndices":""});
        }
      }
      kStart = kStart + tileInner;
      workgroupBarrier();

      // Compute acc values for a single thread.
      var BCached : array<${r}, colPerThread>;
      for (var k = 0; k < tileInner; k = k + 1) {
        for (var inner = 0; inner < colPerThread; inner = inner + 1) {
          BCached[inner] = mm_Bsub[k][localCol + inner * ${t[0]}];
        }
        for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
          let ACached = ${a?`mm_Asub[k][localRow + innerRow * ${t[1]}];`:`mm_Asub[localRow + innerRow * ${t[1]}][k];`}
          for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
            acc[innerRow][innerCol] = acc[innerRow][innerCol] +
                ACached * BCached[innerCol];
          }
        }
      }
      workgroupBarrier();
    }
    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      let gRow = globalRowStart + localRow + innerRow * ${t[1]};
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        let gCol = globalColStart + localCol + innerCol * ${t[0]};
        mm_write(batch, gRow, gCol, acc[innerRow][innerCol]);
      }
    }
    `:`
let tileRow = i32(localId.y) * rowPerThread;
let tileCol = i32(localId.x) * colPerThread;

let globalRow = i32(globalId.y) * rowPerThread;
let globalCol = i32(globalId.x) * colPerThread;
let globalRowStart = i32(workgroupId.y) * ${l};

let tileRowA = i32(localId.y) * ${g};
let tileColA = i32(localId.x) * ${y};
let tileRowB = i32(localId.y) * ${b};
// Loop over shared dimension.
for (var t = 0; t < num_tiles; t = t + 1) {
  // Load one tile of A into local memory.
  for (var innerRow = 0; innerRow < ${g}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < ${y}; innerCol = innerCol + 1) {
      let inputRow = tileRowA + innerRow;
      let inputCol = tileColA + innerCol;
      ${Wi(a,n)}
    }
  }

  // Load one tile of B into local memory.
  for (var innerRow = 0; innerRow < ${b}; innerRow = innerRow + 1) {
    for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
      let inputRow = tileRowB + innerRow;
      let inputCol = tileCol + innerCol;
      mm_Bsub[inputRow][inputCol] = mm_readB(batch,
        kStart + inputRow,
        globalCol + innerCol${n?", batchIndices":""});
    }
  }
  kStart = kStart + tileInner;
  workgroupBarrier();

  // Compute acc values for a single thread.
  var BCached : array<${r}, colPerThread>;
  for (var k = 0; k < tileInner; k = k + 1) {
    for (var inner = 0; inner < colPerThread; inner = inner + 1) {
      BCached[inner] = mm_Bsub[k][tileCol + inner];
    }

    for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
      ${Jo(a)}
      for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
        acc[innerRow][innerCol] = acc[innerRow][innerCol] + ACached * BCached[innerCol];
      }
    }
  }

  workgroupBarrier();
}

for (var innerRow = 0; innerRow < rowPerThread; innerRow = innerRow + 1) {
  for (var innerCol = 0; innerCol < colPerThread; innerCol = innerCol + 1) {
    mm_write(batch, globalRow + innerRow, globalCol + innerCol,
        acc[innerRow][innerCol]);
  }
}
`;return`
  var<workgroup> mm_Asub : array<array<${r}, ${c}>, ${h}>;
  var<workgroup> mm_Bsub : array<array<${r}, ${f}>, ${i}>;
  const rowPerThread = ${e[1]};
  const colPerThread = ${e[0]};
  const tileInner = ${i};

@compute @workgroup_size(${t[0]}, ${t[1]}, ${t[2]})
fn main(@builtin(local_invocation_id) localId : vec3<u32>,
        @builtin(global_invocation_id) globalId : vec3<u32>,
        @builtin(workgroup_id) workgroupId : vec3<u32>) {
    let batch = ${s?"0":"i32(globalId.z)"};
    ${n?`let batchIndices = ${n.offsetToIndices("u32(batch)")};`:""}
    let num_tiles = ${s?`${Math.ceil(u/i)}`:"(uniforms.dim_inner - 1) / tileInner + 1"};
    var kStart = ${s?`i32(globalId.z) * ${u}`:"0"};

    var acc : array<array<${r}, colPerThread>, rowPerThread>;
    ${x}
  }
`},eu=(e,t,r,n,a=!1)=>{let[i,s,u,d]=n,l=Te(n[0].type.tensor);return`
    fn mm_readA(batch: i32, row: i32, colIn: i32, batchIndices: ${i.type.indices}) -> ${Ie(e,l)} {
      var value = ${Ie(e,l)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_a_outer && col < uniforms.dim_inner)
      {
        var aIndices: ${s.type.indices};
        ${lr("aIndices",s,s.rank-2,i.rank,"batchIndices")}
        ${s.indicesSet("aIndices",s.rank-2,"u32(row)")}
        ${s.indicesSet("aIndices",s.rank-1,"u32(colIn)")}
        value = ${s.getByIndices("aIndices")};
      }
      return value;
    }

    fn mm_readB(batch: i32, row: i32, colIn: i32, batchIndices: ${i.type.indices}) -> ${Ie(e,l)} {
      var value = ${Ie(e,l)}(0.0);
      let col = colIn * ${e};
      if(row < uniforms.dim_inner && col < uniforms.dim_b_outer)
      {
        var bIndices: ${u.type.indices};
        ${lr("bIndices",u,u.rank-2,i.rank,"batchIndices")}
        ${u.indicesSet("bIndices",u.rank-2,"u32(row)")}
        ${u.indicesSet("bIndices",u.rank-1,"u32(colIn)")}
        value = ${u.getByIndices("bIndices")};
      }
      return value;
    }

    fn mm_write(batch: i32, row: i32, colIn: i32, valueIn: ${Ie(e,l)}) {
      let col = colIn * ${e};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer) {
        var value = valueIn;
        let coords = vec3<i32>(batch, row, colIn);
        ${t?`value = value + ${a?"bias[colIn]":`${Ie(e,l)}(bias[row])`};`:""}
        ${r}
        ${d.setByIndices("vec3<u32>(coords)","value")}
      }
    }
    `},Hr=(e,t,r,n,a=!1,i)=>{let s=e[0].dims,u=e[1].dims,d=s.slice(0,-2),l=u.slice(0,-2),f=n?n.slice(0,-2):r.slice(0,-2),c=z.size(f),h=s[s.length-2],g=s[s.length-1],y=u[u.length-1],b=g%4===0&&y%4===0,x=h<=8?[4,1,1]:[4,4,1],$=[8,8,1],w=[Math.ceil(y/$[0]/x[0]),Math.ceil(h/$[1]/x[1]),Math.ceil(c/$[2]/x[2])],S=b?4:1,T=[...d,h,g/S],I=T.length,E=[...l,g,y/S],C=E.length,A=[c,h,y/S],O=[{type:6,data:h},{type:6,data:y},{type:6,data:g}];zt(t,O),O.push(...Z(f,T,E));let W=["rank","rank"],X=e.length>2;X&&(O.push(...Z(e[2].dims)),W.push("rank")),O.push(...Z(A));let G=Q=>{let oe=f.length,te=Zn("batchDims",e[0].dataType,oe,1),V=Te(e[0].dataType),L=R("a",e[0].dataType,I,S),le=R("b",e[1].dataType,C,S),ee=H("result",e[0].dataType,A.length,S),ne=[L,le];if(X){let Se=a?S:1;ne.push(R("bias",e[2].dataType,e[2].dims.length,Se))}let D=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"}];At(t,D);let P=Te(ee.type.tensor),j=Ct(t,ee.type.value,P),se=eu(S,X,j,[te,L,le,ee],a);return`
  ${Q.registerUniforms(D).registerInternalVariables(te).declareVariables(...ne,ee)}
  ${se}
  ${b?En(x,$,V,te):Cn(x,$,V,te)}
                   `};return{name:"MatMul",shaderCache:{hint:`${x};${t.activation};${b};${a}`,inputDependencies:W},getRunData:()=>({outputs:[{dims:i?i(r):r,dataType:e[0].dataType}],dispatchGroup:{x:w[0],y:w[1],z:w[2]},programUniforms:O}),getShaderSource:G}}}),tu,_f,pg=U(()=>{J(),st(),ie(),Bt(),ea(),dg(),ia(),tu=(e,t,r,n,a=!1,i,s=4,u=4,d=4,l="f32")=>{let f=O=>{switch(O){case 1:return"resData = x[xIndex];";case 3:return`resData = vec3<${l}>(x[xIndex], x[xIndex + 1], x[xIndex + 2]);`;case 4:return"resData = x[xIndex / 4];";default:throw new Error(`innerElementSize ${O} is not supported.`)}},c=O=>{switch(O){case 1:return"return w[row * i32(uniforms.w_shape[3]) + colIn];";case 4:return"return w[row * i32(uniforms.w_shape[3]) / 4 + colIn];";default:throw new Error(`innerElementSize ${O} is not supported.`)}},h=e?`
    let coord = vec4<i32>(batch, xRow, xCol, xCh);
    `:`
    let coord = vec4<i32>(batch, xCh, xRow, xCol);
    `,g=e?`
    let coords = vec4<i32>(
      batch,
      row / outWidth,
      row % outWidth,
      col);
    `:`
    let coords = vec4<i32>(
      batch,
      row,
      col / outWidth,
      col % outWidth);
    `,y=e?"i32(uniforms.x_shape[1])":"i32(uniforms.x_shape[2])",b=e?"i32(uniforms.x_shape[2])":"i32(uniforms.x_shape[3])",x=e?"row":"col",$=e?"col":"row",w=`
    let inChannels = i32(uniforms.w_shape[2]);
    let outWidth = ${e?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
    let outRow = ${x} / outWidth;
    let outCol = ${x} % outWidth;

    let WRow = ${$} / (i32(uniforms.w_shape[1]) * inChannels);
    let WCol = ${$} / inChannels % i32(uniforms.w_shape[1]);
    let xRow = outRow * uniforms.stride[0] + uniforms.dilation[0] * WRow - uniforms.pad[0];
    let xCol = outCol * uniforms.stride[1] + uniforms.dilation[1] * WCol - uniforms.pad[1];
    let xCh = ${$} % inChannels;
    var resData = ${Ie(s,l)}(0.0);
    // The bounds checking is always needed since we use it to pad zero for
    // the 'same' padding type.
    if (xRow >= 0 && xRow < ${y} && xCol >= 0 && xCol < ${b}) {
      ${h}
      let xIndex = getIndexFromCoords4D(coord, vec4<i32>(uniforms.x_shape));
      ${f(s)}
    }
    return resData;`,S=e?t&&n?`
    let col = colIn * ${s};
    ${w}`:`
    let col = colIn * ${s};
    if (row < uniforms.dim_a_outer && col < uniforms.dim_inner) {
      ${w}
    }
    return ${Ie(s,l)}(0.0);`:n&&r?`
    let col = colIn * ${s};
    ${w}`:`
    let col = colIn * ${s};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${w}
    }
    return ${Ie(s,l)}(0.0);`,T=e?n&&r?c(u):`
    let col = colIn * ${u};
    if (row < uniforms.dim_inner && col < uniforms.dim_b_outer) {
      ${c(u)}
    }
    return ${Ie(u,l)}(0.0);`:`
    let col = colIn * ${u};
    if (row < uniforms.dim_inner && col < uniforms.dim_a_outer) {
      ${c(u)}
    }
    return ${Ie(u,l)}(0.0);`,I=Ie(d,l),E=Ie(e?s:u,l),C=Ie(e?u:s,l),A=Ct(i,I,l);return`
    fn mm_readA(batch: i32, row : i32, colIn : i32) -> ${E} {
      ${e?S:T}
    }

    fn mm_readB(batch: i32, row : i32, colIn : i32) -> ${C} {
      ${e?T:S}
    }

    fn mm_write(batch: i32, row : i32, colIn : i32, valueIn : ${I}) {
      let col = colIn * ${d};
      if (row < uniforms.dim_a_outer && col < uniforms.dim_b_outer)
      {
      var value = valueIn;
      let outWidth = ${e?"i32(uniforms.result_shape[2])":"i32(uniforms.result_shape[3])"};
      ${g}
      ${gf(a)}
      ${A}
      setOutputAtCoords(coords[0], coords[1], coords[2], coords[3], value);
      }
    }`},_f=(e,t,r,n,a,i,s,u,d)=>{let l=t.format==="NHWC",f=l?e[0].dims[3]:e[0].dims[1],c=r[0],h=l?r[2]:r[3],g=l?r[1]:r[2],y=l?r[3]:r[1],b=l&&(f%4===0||f%3===0)&&y%4===0,x=l?y:h*g,$=l?h*g:y,w=[8,8,1],S=n<=8?[4,1,1]:[4,4,1],T=[Math.ceil(x/w[0]/S[0]),Math.ceil($/w[1]/S[1]),Math.ceil(c/w[2]/S[2])];ue("verbose",()=>`[conv2d_mm_webgpu] dispatch = ${T}`);let I=b?l&&f%4!==0?3:4:1,E=w[1]*S[1],C=w[0]*S[0],A=Math.max(w[0]*I,w[1]),O=n%E===0,W=a%C===0,X=i%A===0,G=b?[I,4,4]:[1,1,1],Q=[{type:6,data:n},{type:6,data:a},{type:6,data:i},{type:6,data:[t.pads[0],t.pads[1]]},{type:6,data:t.strides},{type:6,data:t.dilations}];zt(t,Q),Q.push(...Z(e[0].dims,e[1].dims));let oe=["rank","rank"];s&&(Q.push(...Z(e[2].dims)),oe.push("rank")),Q.push(...Z(r));let te=V=>{let L=[{name:"dim_a_outer",type:"i32"},{name:"dim_b_outer",type:"i32"},{name:"dim_inner",type:"i32"},{name:"pad",type:"i32",length:2},{name:"stride",type:"i32",length:2},{name:"dilation",type:"i32",length:2}];At(t,L);let le=b?4:1,ee=Te(e[0].dataType),ne=`
      fn setOutputAtIndex(flatIndex : i32, value : ${b?`vec4<${ee}>`:ee}) {
        result[flatIndex] = ${b?`vec4<${ee}>`:ee}(value);
      }
      fn setOutputAtCoords(d0 : i32, d1 : i32, d2 : i32, d3 : i32, value : ${b?`vec4<${ee}>`:ee}) {
        let flatIndex = getOutputIndexFromCoords(vec4<i32>(d0, d1, d2, d3));
        setOutputAtIndex(flatIndex ${b?"/ 4":""}, value);
      }`,D=R("x",e[0].dataType,e[0].dims.length,I===3?1:I),P=R("w",e[1].dataType,e[1].dims.length,le),j=[D,P],se=H("result",e[0].dataType,r.length,le);if(s){let Se=R("bias",e[2].dataType,e[2].dims.length,le);j.push(Se),ne+=`
        fn getBiasByOutputCoords(coords : vec4<i32>) -> ${b?`vec4<${ee}>`:ee} {
          return bias[coords.${l?"w":"y"}${b?"/ 4":""}];
        }`}return`
        ${yf("uniforms.result_strides")}
        //struct Uniforms { xShape : vec4<i32>, wShape : vec4<i32>, outShape : vec4<i32>,
        //  outShapeStrides: vec3<i32>, filterDims : vec2<i32>, pad : vec2<i32>, stride : vec2<i32>,
        //  dilation : vec2<i32>, dimAOuter : i32, dimBOuter : i32, dimInner : i32 };
        ${V.registerUniforms(L).declareVariables(...j,se)}
        ${ne}
        ${tu(l,O,W,X,s,t,G[0],G[1],G[2],ee)}
        ${b?En(S,w,ee,void 0,!l,A):Cn(S,w,ee,void 0,!l,A,!1,void 0,u)}`};return{name:"Conv2DMatMul",shaderCache:{hint:`${t.cacheKey};${I};${b};${O};${W};${X};${E};${C};${A}`,inputDependencies:oe},getRunData:()=>({outputs:[{dims:d?d(r):r,dataType:e[0].dataType}],dispatchGroup:{x:T[0],y:T[1],z:T[2]},programUniforms:Q}),getShaderSource:te}}}),ru,Li,Jt,iu,qi,nu,bf,wf,fg=U(()=>{J(),st(),re(),ie(),Bt(),ea(),ru=e=>{let t=1;for(let r=0;r<e.length;r++)t*=e[r];return t},Li=e=>typeof e=="number"?[e,e,e]:e,Jt=(e,t)=>t<=1?e:e+(e-1)*(t-1),iu=(e,t,r,n=1)=>{let a=Jt(t,n);return Math.floor((e[0]*(r-1)-r+a)/2)},qi=(e,t,r,n,a)=>{a==null&&(a=iu(e,t[0],n[0]));let i=[0,0,0,r];for(let s=0;s<3;s++)e[s]+2*a>=t[s]&&(i[s]=Math.trunc((e[s]-t[s]+2*a)/n[s]+1));return i},nu=(e,t,r,n,a,i,s,u,d,l)=>{let f,c,h,g;if(e==="VALID"&&(e=0),typeof e=="number"){f={top:e,bottom:e,left:e,right:e,front:e,back:e};let y=qi([t,r,n,1],[u,d,l],1,[a,i,s],e);c=y[0],h=y[1],g=y[2]}else if(Array.isArray(e)){if(!e.every((b,x,$)=>b===$[0]))throw Error(`Unsupported padding parameter: ${e}`);f={top:e[0],bottom:e[1],left:e[2],right:e[3],front:e[4],back:e[5]};let y=qi([t,r,n,1],[u,d,l],1,[a,i,s],e[0]);c=y[0],h=y[1],g=y[2]}else if(e==="SAME_UPPER"){c=Math.ceil(t/a),h=Math.ceil(r/i),g=Math.ceil(n/s);let y=(c-1)*a+u-t,b=(h-1)*i+d-r,x=(g-1)*s+l-n,$=Math.floor(y/2),w=y-$,S=Math.floor(b/2),T=b-S,I=Math.floor(x/2),E=x-I;f={top:S,bottom:T,left:I,right:E,front:$,back:w}}else throw Error(`Unknown padding parameter: ${e}`);return{padInfo:f,outDepth:c,outHeight:h,outWidth:g}},bf=(e,t,r,n,a,i=!1,s="channelsLast")=>{let u,d,l,f,c;if(s==="channelsLast")[u,d,l,f,c]=e;else if(s==="channelsFirst")[u,c,d,l,f]=e;else throw new Error(`Unknown dataFormat ${s}`);let[h,,g,y,b]=t,[x,$,w]=Li(r),[S,T,I]=Li(n),E=Jt(g,S),C=Jt(y,T),A=Jt(b,I),{padInfo:O,outDepth:W,outHeight:X,outWidth:G}=nu(a,d,l,f,x,$,w,E,C,A),Q=i?h*c:h,oe=[0,0,0,0,0];return s==="channelsFirst"?oe=[u,Q,W,X,G]:s==="channelsLast"&&(oe=[u,W,X,G,Q]),{batchSize:u,dataFormat:s,inDepth:d,inHeight:l,inWidth:f,inChannels:c,outDepth:W,outHeight:X,outWidth:G,outChannels:Q,padInfo:O,strideDepth:x,strideHeight:$,strideWidth:w,filterDepth:g,filterHeight:y,filterWidth:b,effectiveFilterDepth:E,effectiveFilterHeight:C,effectiveFilterWidth:A,dilationDepth:S,dilationHeight:T,dilationWidth:I,inShape:e,outShape:oe,filterShape:t}},wf=(e,t,r,n,a,i)=>{let s=i==="channelsLast";s?e[0].dims[3]:e[0].dims[1];let u=[64,1,1],d={x:r.map((x,$)=>$)},l=[Math.ceil(ru(d.x.map(x=>r[x]))/u[0]),1,1];ue("verbose",()=>`[conv3d_naive_webgpu] dispatch = ${l}`);let f=1,c=z.size(r),h=[{type:12,data:c},{type:12,data:n},{type:12,data:a},{type:12,data:t.strides},{type:12,data:t.dilations}];zt(t,h),h.push(...Z(e[0].dims,e[1].dims));let g=["rank","rank"],y=e.length===3;y&&(h.push(...Z(e[2].dims)),g.push("rank")),h.push(...Z(r));let b=x=>{let $=[{name:"output_size",type:"u32"},{name:"filter_dims",type:"u32",length:n.length},{name:"pads",type:"u32",length:a.length},{name:"strides",type:"u32",length:t.strides.length},{name:"dilations",type:"u32",length:t.dilations.length}];At(t,$);let w=1,S=Te(e[0].dataType),T=R("x",e[0].dataType,e[0].dims.length,f),I=R("W",e[1].dataType,e[1].dims.length,w),E=[T,I],C=H("result",e[0].dataType,r.length,w),A="";if(y){let X=R("bias",e[2].dataType,e[2].dims.length,w);E.push(X),A+=`
        fn getBiasByOutputCoords(coords : array<u32, 5>) -> ${S} {
          return bias[${s?F("coords",4,5):F("coords",1,5)}];
        }`}let O=Ie(f,S),W=Ct(t,O,S);return`
            ${A}
            fn getX(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> f32 {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${T.getByIndices("aIndices")};
            }
            fn getW(d0 : u32, d1 : u32, d2 : u32, d3 : u32, d4 : u32) -> f32 {
              let aIndices = array<u32, 5>(d0, d1, d2, d3, d4);
              return ${I.getByIndices("aIndices")};
            }
          ${x.registerUniforms($).declareVariables(...E,C)}
          ${x.mainStart()}
          ${x.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
              let coords = ${C.offsetToIndices("global_idx")};
              let batch = ${F("coords",0,T.rank)};
              let d2 = ${s?F("coords",T.rank-1,T.rank):F("coords",1,T.rank)};
              let xFRCCorner = vec3<u32>(${s?F("coords",1,T.rank):F("coords",2,T.rank)},
              ${s?F("coords",2,T.rank):F("coords",3,T.rank)},
              ${s?F("coords",3,T.rank):F("coords",4,T.rank)}) * uniforms.strides - uniforms.pads;
              let xFCorner = xFRCCorner.x;
              let xRCorner = xFRCCorner.y;
              let xCCorner = xFRCCorner.z;
              let xShapeY = ${s?F("uniforms.x_shape",1,T.rank):F("uniforms.x_shape",2,T.rank)};
              let xShapeZ = ${s?F("uniforms.x_shape",2,T.rank):F("uniforms.x_shape",3,T.rank)};
              let xShapeW = ${s?F("uniforms.x_shape",3,T.rank):F("uniforms.x_shape",4,T.rank)};
              let xShapeU = ${s?F("uniforms.x_shape",4,T.rank):F("uniforms.x_shape",1,T.rank)};
              let inputDepthNearestVec4 = (xShapeU / 4) * 4;
              let inputDepthVec4Remainder = xShapeU % 4;

              var value = 0.0;
              for (var wF = 0u; wF < uniforms.filter_dims[0]; wF++) {
                let xF = xFCorner + wF * uniforms.dilations[0];
                if (xF < 0 || xF >= xShapeY) {
                  continue;
                }

                for (var wR = 0u; wR < uniforms.filter_dims[1]; wR++) {
                  let xR = xRCorner + wR * uniforms.dilations[1];
                  if (xR < 0 || xR >= xShapeZ) {
                    continue;
                  }

                  for (var wC = 0u; wC < uniforms.filter_dims[2]; wC++) {
                    let xC = xCCorner + wC * uniforms.dilations[2];
                    if (xC < 0 || xC >= xShapeW) {
                      continue;
                    }

                    for (var d1 = 0u; d1 < inputDepthNearestVec4; d1 += 4) {
                      ${s?`let xValues = vec4<f32>(
                               getX(batch, xF, xR, xC, d1),
                               getX(batch, xF, xR, xC, d1 + 1),
                               getX(batch, xF, xR, xC, d1 + 2),
                               getX(batch, xF, xR, xC, d1 + 3));
                            `:`let xValues = vec4<f32>(
                               getX(batch, d1, xF, xR, xC),
                               getX(batch, d1 + 1, xF, xR, xC),
                               getX(batch, d1 + 2, xF, xR, xC),
                               getX(batch, d1 + 3, xF, xR, xC));
                            `}
                            let wValues = vec4<f32>(
                              getW(d2, d1, wF, wR, wC),
                              getW(d2, d1 + 1, wF, wR, wC),
                              getW(d2, d1 + 2, wF, wR, wC),
                              getW(d2, d1 + 3, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                    if (inputDepthVec4Remainder == 1) {
                        ${s?`value += getX(batch, xF, xR, xC, inputDepthNearestVec4)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`:`value += getX(batch, inputDepthNearestVec4, xF, xR, xC)
                          * getW(d2, inputDepthNearestVec4, wF, wR, wC);`}
                    } else if (inputDepthVec4Remainder == 2) {
                      ${s?`let xValues = vec2<f32>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1));
                      `:`let xValues = vec2<f32>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC));
                    `}
                    let wValues = vec2<f32>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC));
                      value += dot(xValues, wValues);
                    } else if (inputDepthVec4Remainder == 3) {
                      ${s?`let xValues = vec3<f32>(
                        getX(batch, xF, xR, xC, inputDepthNearestVec4),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 1),
                        getX(batch, xF, xR, xC, inputDepthNearestVec4 + 2));
                      `:`let xValues = vec3<f32>(
                        getX(batch, inputDepthNearestVec4, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 1, xF, xR, xC),
                        getX(batch, inputDepthNearestVec4 + 2, xF, xR, xC));
                    `}
                    let wValues = vec3<f32>(
                      getW(d2, inputDepthNearestVec4, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 1, wF, wR, wC),
                      getW(d2, inputDepthNearestVec4 + 2, wF, wR, wC));
                      value += dot(xValues, wValues);
                    }
                  }
                }
              }
              ${y?"value = value + getBiasByOutputCoords(coords)":""};
              ${W}
              result[global_idx] = f32(value);
          }`};return{name:"Conv3DNaive",shaderCache:{hint:`${t.cacheKey};${s};${f};${y}`,inputDependencies:g},getRunData:()=>({outputs:[{dims:r,dataType:e[0].dataType}],dispatchGroup:{x:l[0],y:l[1],z:l[2]},programUniforms:h}),getShaderSource:b}}}),$f,vf,cg=U(()=>{J(),re(),ie(),Bt(),$f=(e,t,r,n)=>{let a=e.length>2,i=a?"value += b[output_channel];":"",s=e[0].dims,u=e[1].dims,d=t.format==="NHWC",l=d?r[3]:r[1],f=l/t.group,c=d&&f>=4?we(l):1,h=z.size(r)/c,g=[{type:12,data:h},{type:12,data:t.dilations},{type:12,data:[t.strides[0],t.strides[1]]},{type:12,data:[t.pads[0],t.pads[1]]},{type:12,data:f}];zt(t,g),g.push(...Z(s,[u[0],u[1],u[2],u[3]/c]));let y=a?["rank","rank","rank"]:["rank","rank"];g.push(...Z([r[0],r[1],r[2],r[3]/c]));let b=x=>{let $=H("output",e[0].dataType,r.length,c),w=Te($.type.tensor),S=Ct(t,$.type.value,w),T=R("x",e[0].dataType,s.length),I=R("w",e[1].dataType,u.length,c),E=[T,I];a&&E.push(R("b",e[2].dataType,e[2].dims,c));let C=[{name:"output_size",type:"u32"},{name:"dilations",type:"u32",length:t.dilations.length},{name:"strides",type:"u32",length:2},{name:"pads",type:"u32",length:2},{name:"output_channels_per_group",type:"u32"}];At(t,C);let A=d?`
      for (var wHeight: u32 = 0u; wHeight < uniforms.w_shape[0]; wHeight++) {
        let xHeight = xRCCorner.x + wHeight * uniforms.dilations[0];

        if (xHeight < 0u || xHeight >= uniforms.x_shape[1]) {
          continue;
        }

        for (var wWidth: u32 = 0u; wWidth < uniforms.w_shape[1]; wWidth++) {
          let xWidth = xRCCorner.y + wWidth * uniforms.dilations[1];
          if (xWidth < 0u || xWidth >= uniforms.x_shape[2]) {
            continue;
          }

          for (var wInChannel: u32 = 0u; wInChannel < uniforms.w_shape[2]; wInChannel++) {
            let input_channel = in_channel_offset + wInChannel;
            let xVal = ${T.get("batch","xHeight","xWidth","input_channel")};
            let wVal = ${I.get("wHeight","wWidth","wInChannel","output_channel")};
            value += xVal * wVal;
          }
        }
      }
      `:`
      for (var wInChannel: u32 = 0u; wInChannel < uniforms.w_shape[1]; wInChannel++) {
        let input_channel = in_channel_offset + wInChannel;
        for (var wHeight: u32 = 0u; wHeight < uniforms.w_shape[2]; wHeight++) {
          let xHeight = xRCCorner.x + wHeight * uniforms.dilations[0];

          if (xHeight < 0u || xHeight >= uniforms.x_shape[2]) {
            continue;
          }

          for (var wWidth: u32 = 0u; wWidth < uniforms.w_shape[3]; wWidth++) {
            let xWidth = xRCCorner.y + wWidth * uniforms.dilations[1];
            if (xWidth < 0u || xWidth >= uniforms.x_shape[3]) {
              continue;
            }

            let xVal = ${T.get("batch","input_channel","xHeight","xWidth")};
            let wVal = ${I.get("output_channel","wInChannel","wHeight","wWidth")};
            value += xVal * wVal;
          }
        }
      }
      `;return`
  ${x.registerUniforms(C).declareVariables(...E,$)}

  ${x.mainStart()}
    ${x.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let outputIndices = ${$.offsetToIndices("global_idx")};
    let batch: u32 = outputIndices[0];
    let output_channel: u32 = outputIndices[${d?3:1}];
    let xRCCorner: vec2<u32> = vec2<u32>(outputIndices[${d?1:2}], outputIndices[${d?2:3}]) * uniforms.strides - uniforms.pads;
    let group_id: u32 = output_channel * ${c} / uniforms.output_channels_per_group;
    var in_channel_offset = group_id * uniforms.w_shape[${d?2:1}];

    var value: ${$.type.value} = ${$.type.value}(0);
    ${A}
    ${i}
    ${S}
    ${$.setByOffset("global_idx","value")}
  }`};return{name:"GroupedConv",shaderCache:{hint:`${t.cacheKey}_${c}`,inputDependencies:y},getRunData:()=>({outputs:[{dims:n?n(r):r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(h/64)},programUniforms:g}),getShaderSource:b}},vf=(e,t,r,n)=>{let a=e.length>2,i=we(r[3]),s=we(r[2]),u=z.size(r)/i/s,d=[e[0].dims[0],e[0].dims[1],e[0].dims[2],e[0].dims[3]/i],l=[e[1].dims[0],e[1].dims[1],e[1].dims[2],e[1].dims[3]/i],f=[r[0],r[1],r[2],r[3]/i],c=[{type:12,data:u},{type:6,data:[t.strides[0],t.strides[1]]},{type:6,data:[t.pads[0],t.pads[1]]}];zt(t,c),c.push(...Z(d,l,f));let h=(s-1)*t.strides[1]+l[1],g=y=>{let b=H("output",e[0].dataType,f.length,i),x=Te(b.type.tensor),$=Ct(t,b.type.value,x),w=R("x",e[0].dataType,d.length,i),S=R("w",e[1].dataType,l.length,i),T=[w,S];a&&T.push(R("b",e[2].dataType,e[2].dims,i));let I=a?"value += b[output_channel];":"",E=[{name:"output_size",type:"u32"},{name:"strides",type:"i32",length:2},{name:"pads",type:"i32",length:2}];return At(t,E),`
  ${y.registerUniforms(E).declareVariables(...T,b)}
  ${y.mainStart()}
    ${y.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let width0 = uniforms.output_shape[3];
    let output_channel = global_idx % width0;
    var index1 = global_idx / width0;
    let width1 = uniforms.output_shape[2] / ${s}u;
    let col = (index1 % width1) * ${s}u;
    index1 = index1 / width1;
    let row = index1 % uniforms.output_shape[1];
    let batch = index1 / uniforms.output_shape[1];

    let x_corner = vec2<i32>(i32(row), i32(col)) * uniforms.strides - uniforms.pads;

    var x_vals: array<${w.type.value}, ${h}>;
    var values: array<${b.type.value}, ${s}>;
    let input_channel = output_channel;
    // Use constant instead of uniform can give better performance for w's height/width.
    for (var w_height: u32 = 0u; w_height < ${l[0]}; w_height++) {
      let x_height = x_corner.x + i32(w_height);
      if (x_height >= 0 && u32(x_height) < uniforms.x_shape[1]) {
        for (var i = 0; i < ${h}; i++) {
          let x_width = x_corner.y + i;
          if (x_width >= 0 && u32(x_width) < uniforms.x_shape[2]) {
            x_vals[i] = ${w.get("batch","u32(x_height)","u32(x_width)","input_channel")};
          } else {
            x_vals[i] = ${w.type.value}(0);
          }
        }
        for (var w_width: u32 = 0u; w_width < ${l[1]}; w_width++) {
          let w_val = ${S.get("w_height","w_width","0","output_channel")};
          for (var i = 0u; i < ${s}u; i++) {
            values[i] = fma(x_vals[i * u32(uniforms.strides[1]) + w_width], w_val, values[i]);
          }
        }
      }
    }

    for (var i = 0u; i < ${s}u; i++) {
      var value = values[i];
      ${I}
      ${$}
      ${b.set("batch","row","col + i","output_channel","value")};
    }
  }`};return{name:"GroupedConv-Vectorize",shaderCache:{hint:`${t.cacheKey};${i};${s};${h};${l[0]};${l[1]}`,inputDependencies:a?["rank","rank","type"]:["rank","rank"]},getRunData:()=>({outputs:[{dims:n?n(r):r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:c}),getShaderSource:g}}}),au,Or,su,Br,zn,Vi,ou,uu,An,hg=U(()=>{re(),pg(),fg(),ia(),cg(),Bt(),ra(),yt(),au=(e,t,r,n,a,i)=>{let s=e[0],u=e.slice(i?1:2,i?3:4),d=u.length,l=t[0],f=t.slice(2).map((h,g)=>h+(h-1)*(r[g]-1)),c=u.map((h,g)=>h+n[g]+n[g+d]).map((h,g)=>Math.floor((h-f[g]+a[g])/a[g]));return c.splice(0,0,s),c.splice(i?3:1,0,l),c},Or=[2,3,1,0],su=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(e[0].dims.length>5)throw new Error("greater than 5D is not supported");if(e[0].dims.length!==e[1].dims.length)throw new Error("filter does not have same dimension as input");let r=e[0].dims[t.format==="NHWC"?e[0].dims.length-1:1],n=e[1].dims[1]*t.group;if(r!==n)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");if(e.length===3&&(e[2].dims.length!==1||e[1].dims[0]!==e[2].dims[0]))throw new Error("invalid bias");let a=e[0].dims.length-2;if(t.dilations.length!==a)throw new Error(`dilations should be ${a}D`);if(t.strides.length!==a)throw new Error(`strides should be ${a}D`);if(t.pads.length!==a*2)throw new Error(`pads should be ${a*2}D`);if(t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw new Error("invalid kernel shape")},Br=(e,t)=>{let r=e.kernelShape.slice();r.length<t[1].dims.length-2&&r.push(...Array(t[1].dims.length-2-r.length).fill(0));for(let i=2;i<t[1].dims.length;++i)r[i-2]===0&&(r[i-2]=t[1].dims[i]);let n=e.pads.slice();jr.adjustPadsBasedOnAutoPad(t[0].dims,e.strides,e.dilations,r,n,e.format==="NHWC",e.autoPad);let a=Object.assign({},e);return Object.assign(a,{kernelShape:r,pads:n}),a},zn=e=>{let t=Jn(e),r=e.format,n=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][e.auto_pad],a=e.dilations,i=e.group,s=e.kernel_shape,u=e.pads,d=e.strides,l=e.w_is_const();return{autoPad:n,format:r,dilations:a,group:i,kernelShape:s,pads:u,strides:d,wIsConst:l,...t,cacheKey:`${e.format};${t.activation};`}},Vi=(e,t,r,n)=>{let a=r.format==="NHWC",i=au(t[0].dims,t[1].dims,r.dilations,r.pads,r.strides,a);if(r.group!==1){let E=[t[0]];if(a){let C=e.kernelCustomData.wT??e.compute(De(t[1],Or),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=C),E.push(C)}else E.push(t[1]);t.length===3&&E.push(t[2]),!e.adapterInfo.isArchitecture("ampere")&&a&&t[1].dims[0]===r.group&&t[1].dims[1]===1&&r.dilations[0]===1&&r.dilations[1]===1?e.compute(vf(E,r,i,n),{inputs:E}):e.compute($f(E,r,i,n),{inputs:E});return}let s=t.length===3,u=t[0].dims[a?1:2],d=t[0].dims[a?2:3],l=t[0].dims[a?3:1],f=t[1].dims[2],c=t[1].dims[3],h=i[a?1:2],g=i[a?2:3],y=i[a?3:1],b=a&&f===u&&c===d&&r.pads[0]===0&&r.pads[1]===0;if(b||f===1&&c===1&&r.dilations[0]===1&&r.dilations[1]===1&&r.strides[0]===1&&r.strides[1]===1&&r.pads[0]===0&&r.pads[1]===0){let E=i[0],C,A,O,W=[];if(a){let Q=e.kernelCustomData.wT??e.compute(De(t[1],Or),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];if(r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=Q),b){let oe=u*d*l;C=t[0].reshape([1,E,oe]),A=Q.reshape([1,oe,y]),O=[1,E,y]}else C=t[0].reshape([E,u*d,l]),A=Q.reshape([1,l,y]),O=[E,h*g,y];W.push(C),W.push(A)}else C=t[0].reshape([E,l,u*d]),A=t[1].reshape([1,y,l]),O=[E,y,h*g],W.push(A),W.push(C);s&&W.push(t[2]);let X=O[2],G=W[0].dims[W[0].dims.length-1];X<8&&G<8?e.compute(ta(W,r,i,O,a,n),{inputs:W}):e.compute(Hr(W,r,i,O,a,n),{inputs:W});return}let x=!0,$=e.kernelCustomData.wT??e.compute(De(t[1],Or),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=$);let w=[t[0],$];s&&w.push(t[2]);let S=a?h*g:y,T=a?y:h*g,I=f*c*l;e.compute(_f(w,r,i,S,T,I,s,x,n),{inputs:w})},ou=(e,t)=>{let r=t.format==="NHWC",n=[e.inputs[0].reshape(r?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&n.push(e.inputs[2]);let a=[0,t.pads[0],0,t.pads[1]],i=[1].concat(t.strides),s=[1].concat(t.dilations),u=[1].concat(t.kernelShape),d=Br({...t,pads:a,strides:i,dilations:s,kernelShape:u},n);Vi(e,n,d,l=>r?[l[0],l[2],l[3]]:[l[0],l[1],l[3]])},uu=(e,t,r)=>{let n=r.format==="NHWC"?"channelsLast":"channelsFirst",a=Br(r,t),i=r.autoPad==="NOTSET"?r.pads:r.autoPad,s=bf(t[0].dims,t[1].dims,r.strides,r.dilations,i,!1,n);e.compute(wf(t,a,s.outShape,[s.filterDepth,s.filterHeight,s.filterWidth],[s.padInfo.front,s.padInfo.top,s.padInfo.left],n))},An=(e,t)=>{if(su(e.inputs,t),e.inputs[0].dims.length===3)ou(e,t);else if(e.inputs[0].dims.length===5)uu(e,e.inputs,t);else{let r=Br(t,e.inputs);Vi(e,e.inputs,r)}}}),xf,mg=U(()=>{J(),st(),re(),ie(),xf=(e,t,r)=>{let n=e.length>2,a=t.outputShape,i=t.format==="NHWC",s=t.group,u=e[1].dims,d=u[2]/s,l=u[3],f=i?we(d):1,c=i&&l===1&&d>=4,h=c?Math.floor(d/4)*4:Math.floor(d/f)*f,g=d-h,y=i?we(l):1,b=i?l===1?f:y:1,x=z.size(a)/y,$=[Math.ceil(x/64),1,1];ue("verbose",()=>`[conv2d_backprop_webgpu] dispatch = ${$}`);let w=["rank","rank"],S=[t.strides[0],t.strides[1]],T=[t.kernelShape[i?1:2],t.kernelShape[i?2:3]],I=[t.dilations[0],t.dilations[1]],E=[T[0]+(t.dilations[0]<=1?0:(t.kernelShape[i?1:2]-1)*(t.dilations[0]-1)),T[1]+(t.dilations[1]<=1?0:(t.kernelShape[i?2:3]-1)*(t.dilations[1]-1))],C=[E[0]-1-Math.floor((t.pads[0]+t.pads[2])/2),E[1]-1-Math.floor((t.pads[1]+t.pads[3])/2)],A=[{type:12,data:x},{type:12,data:S},{type:12,data:T},{type:12,data:I},{type:12,data:E},{type:6,data:C},{type:12,data:h},{type:12,data:d},{type:12,data:l},...Z(e[0].dims,e[1].dims)];n&&(A.push(...Z(e[2].dims)),w.push("rank")),A.push(...Z(a));let O=W=>{let X=[{name:"output_size",type:"u32"},{name:"strides",type:"u32",length:S.length},{name:"filter_dims",type:"u32",length:T.length},{name:"dilations",type:"u32",length:T.length},{name:"effective_filter_dims",type:"u32",length:E.length},{name:"pads",type:"i32",length:C.length},{name:"input_channels_per_group_int",type:"u32"},{name:"input_channels_per_group",type:"u32"},{name:"output_channels_per_group",type:"u32"}],G=Te(e[0].dataType),Q=i?1:2,oe=i?2:3,te=i?3:1,V=R("W",e[1].dataType,e[1].dims.length,b),L=R("Dy",e[0].dataType,e[0].dims.length,f),le=[L,V];n&&le.push(R("bias",e[2].dataType,[a[te]].length,y));let ee=H("result",e[0].dataType,a.length,y),ne=()=>{let j="";if(c)f===4?j+=`
        let xValue = ${L.getByOffset("x_offset")};
        let wValue = ${V.getByOffset("w_offset")};
        dotProd = dotProd + dot(xValue, wValue);
        x_offset += 1u;
        w_offset += 1u;`:f===2?j+=`
          dotProd = dotProd + dot(vec4<${G}>(${L.getByOffset("x_offset")}, ${L.getByOffset("x_offset + 1u")}), vec4<${G}>(${V.getByOffset("w_offset")}, ${V.getByOffset("w_offset + 1u")}));
          x_offset += 2u;
          w_offset += 2u;`:f===1&&(j+=`
          dotProd = dotProd + dot(vec4<${G}>(${L.getByOffset("x_offset")}, ${L.getByOffset("x_offset + 1u")}, ${L.getByOffset("x_offset + 2u")}, ${L.getByOffset("x_offset + 3u")}), vec4<${G}>(${V.getByOffset("w_offset")}, ${V.getByOffset("w_offset + 1u")}, ${V.getByOffset("w_offset + 2u")}, ${V.getByOffset("w_offset + 3u")}));
          x_offset += 4u;
          w_offset += 4u;`);else if(j+=`
                  let xValue = ${i?L.getByOffset(`${L.indicesToOffset(`${L.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${f}`):L.get("batch","inputChannel","idyR","idyC")};
        `,f===1)j+=`
          let w_offset = ${V.indicesToOffset(`${V.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel, wOutChannel)`)};
          let wValue = ${V.getByOffset(`w_offset / ${b}`)};
          dotProd = dotProd + xValue * wValue;`;else for(let se=0;se<f;se++)j+=`
            let wValue${se} = ${V.getByOffset(`${V.indicesToOffset(`${V.type.indices}(u32(wRPerm), u32(wCPerm), inputChannel + ${se}, wOutChannel)`)} / ${b}`)};
            dotProd = dotProd + xValue[${se}] * wValue${se};`;return j},D=()=>{if(g===0)return"";if(!c)throw new Error(`packInputAs4 ${c} is not true.`);let j="";if(f===1){j+="dotProd = dotProd";for(let se=0;se<g;se++)j+=`
            + ${L.getByOffset(`x_offset + ${se}`)} * ${V.getByOffset(`w_offset + ${se}`)}`;j+=";"}else if(f===2){if(g!==2)throw new Error(`Invalid inputChannelsRemainder ${g}.`);j+=`
          let xValue = ${L.getByOffset("x_offset")};
          let wValue = ${V.getByOffset("w_offset")};
          dotProd = dotProd + dot(xValue, wValue);`}return j},P=`
            let outputIndices = ${ee.offsetToIndices(`global_idx * ${y}`)};
            let batch = ${ee.indicesGet("outputIndices",0)};
            let d1 = ${ee.indicesGet("outputIndices",te)};
            let r = ${ee.indicesGet("outputIndices",Q)};
            let c = ${ee.indicesGet("outputIndices",oe)};
            let dyCorner = vec2<i32>(i32(r), i32(c)) - uniforms.pads;
            let dyRCorner = dyCorner.x;
            let dyCCorner = dyCorner.y;
            let groupId = d1 / uniforms.output_channels_per_group;
            let wOutChannel = d1 - groupId * uniforms.output_channels_per_group;
            // Convolve dy(?, ?, d2) with w(:, :, d1, d2) to compute dx(xR, xC, d1).
            // ? = to be determined. : = across all values in that axis.
            var dotProd = ${ee.type.value}(0.0);
            var wR: u32 = 0;
            if (uniforms.dilations.x == 1) {
              // Minimum wR >= 0 that satisfies (dyRCorner + wR) % (uniforms.strides.x) == 0
              wR = u32(((dyRCorner + i32(uniforms.strides.x) - 1) / i32(uniforms.strides.x)) * i32(uniforms.strides.x) - dyRCorner);
            }
            for (; wR < uniforms.effective_filter_dims.x; wR = wR + 1) {
              if (wR % uniforms.dilations.x != 0) {
                continue;
              }
              let dyR = (${G}(dyRCorner) + ${G}(wR)) / ${G}(uniforms.strides[0]);
              let wRPerm = uniforms.filter_dims.x - 1 - wR / uniforms.dilations.x;
              if (dyR < 0.0 || dyR >= ${G}(uniforms.Dy_shape[${Q}]) || fract(dyR) > 0.0 ||
                  wRPerm < 0) {
                continue;
              }
              let idyR: u32 = u32(dyR);
              var wC: u32 = 0;
              if (uniforms.dilations.y == 1) {
                // Minimum wC >= 0 that satisfies (dyCCorner + wC) % (uniforms.strides.y) == 0
                wC = u32(((dyCCorner + i32(uniforms.strides.y) - 1) / i32(uniforms.strides.y)) * i32(uniforms.strides.y) - dyCCorner);
              }
              for (; wC < uniforms.effective_filter_dims.y; wC = wC + 1) {
                if (wC % uniforms.dilations.y != 0) {
                  continue;
                }
                let dyC = (${G}(dyCCorner) + ${G}(wC)) / ${G}(uniforms.strides.y);
                let wCPerm = uniforms.filter_dims.y - 1 - wC / uniforms.dilations.y;
                if (dyC < 0.0 || dyC >= ${G}(uniforms.Dy_shape[${oe}]) ||
                    fract(dyC) > 0.0 || wCPerm < 0) {
                  continue;
                }
                let idyC: u32 = u32(dyC);
                var inputChannel = groupId * uniforms.input_channels_per_group;
                ${c?`
                var x_offset = ${L.indicesToOffset(`${L.type.indices}(batch, idyR, idyC, inputChannel)`)} / ${f};
                var w_offset = ${V.indicesToOffset(`${V.type.indices}(wRPerm, wCPerm, inputChannel, wOutChannel)`)} / ${b};
                  `:""}
                for (var d2: u32 = 0; d2 < uniforms.input_channels_per_group_int; d2 = d2 + ${c?4:f}) {
                  ${ne()}
                  inputChannel = inputChannel + ${c?4:f};
                }
                ${D()}
                wC = wC + uniforms.strides.y - 1;
              }
              wR = wR + uniforms.strides[0] - 1;
            }
            let value = dotProd${n?` + bias[d1 / ${y}]`:""};
            ${ee.setByOffset("global_idx","value")};
          `;return`
    ${W.registerUniforms(X).declareVariables(...le,ee)}
      ${W.mainStart()}
      ${W.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")};
    ${P}}`};return{name:"ConvTranspose2D",shaderCache:{hint:`${t.cacheKey};${f}${b}${y}${c}${g}`,inputDependencies:w},getRunData:()=>({dispatchGroup:{x:$[0],y:$[1],z:$[2]},outputs:[{dims:r?r(a):a,dataType:e[0].dataType}],programUniforms:A}),getShaderSource:O}}}),lu,du,pu,ji,Tf,fu,Gi,cu,Sf,gg=U(()=>{mg(),Bt(),yt(),lu=(e,t,r,n,a,i)=>(e-1)*t+r+(n-1)*a+1-i,du=(e,t,r,n,a)=>{let i=Math.floor(e/2);t==="SAME_UPPER"?(r[n]=i,r[a]=e-i):t==="SAME_LOWER"&&(r[n]=e-i,r[a]=i)},pu=(e,t,r,n,a,i,s,u,d,l)=>{let f=e.length-2,c=l.length===0;d.length<f&&d.push(...Array(f-d.length).fill(0));let h=e[0],g=t[u?3:1]*a;for(let y=0,b=e.length-f-(u?1:0);y<f;++y,++b){let x=e[b],$=c?x*s[y]:l[y],w=lu(x,s[y],i[y],t[b],r[y],$);du(w,n,i,y,y+f),c&&l.push(s[y]*(x-1)+d[y]+(t[b]-1)*r[y]+1-i[y]-i[y+f])}l.splice(0,0,h),l.splice(u?3:1,0,g)},ji=(e,t)=>{let r=e.kernelShape.slice();if(e.kernelShape.length===0||e.kernelShape.reduce((c,h)=>c*h,1)===0){r.length=0;for(let c=2;c<t[1].dims.length;++c)r.push(t[1].dims[c])}let n=e.format==="NHWC";r.splice(0,0,t[1].dims[0]),r.splice(n?3:1,0,t[1].dims[1]);let a=e.pads.slice(),i=e.outputShape.slice(),s=e.outputPadding.slice(),u=t[0].dims,d=e.dilations.slice();if(d.reduce((c,h)=>c+h,0)===0){let c=t[0].dims.length-2;d=new Array(c).fill(1)}let l=e.strides.slice();if(l.reduce((c,h)=>c+h,0)===0){let c=t[0].dims.length-2;l=new Array(c).fill(1)}pu(u,r,d,e.autoPad,e.group,a,l,n,s,i);let f=Object.assign({},e);return Object.assign(f,{kernelShape:r,pads:a,outputPadding:s,outputShape:i,dilations:d,strides:l}),f},Tf=e=>{let t=Jn(e),r=e.format,n=["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][typeof e.autoPad>"u"?0:e.autoPad],a=e.dilations,i=e.group,s=e.kernelShape,u=e.pads,d=e.strides,l=e.wIsConst(),f=e.outputPadding,c=e.outputShape;return{autoPad:n,format:r,dilations:a,group:i,kernelShape:s,outputPadding:f,outputShape:c,pads:u,strides:d,wIsConst:l,...t,cacheKey:`${e.format};${t.activation};`}},fu=(e,t)=>{if(!e||e.length!==2&&e.length!==3)throw new Error("Conv requires 2 or 3 inputs");if(e[0].dims.length!==4&&e[0].dims.length!==3)throw new Error("currently only support 2-dimensional conv");if(e[0].dims.length!==e[1].dims.length)throw new Error("filter does not have same dimension as input");let r=e[0].dims[t.format==="NHWC"?e[0].dims.length-1:1],n=e[1].dims[0];if(r!==n)throw new Error("FILTER_IN_CHANNEL should be equal to DATA_CHANNEL");let a=e[1].dims[1]*t.group;if(e.length===3&&(e[2].dims.length!==1||e[2].dims[0]!==a))throw new Error("invalid bias");let i=e[0].dims.length-2;if(t.dilations.reduce((s,u)=>s+u,0)>0&&t.dilations.length!==i)throw new Error(`dilations should be ${i}D`);if(t.strides.reduce((s,u)=>s+u,0)>0&&t.strides.length!==i)throw new Error(`strides should be ${i}D`);if(t.pads.reduce((s,u)=>s+u,0)>0&&t.pads.length!==i*2)throw new Error(`pads should be ${i*2}D`);if(t.outputPadding.length!==i&&t.outputPadding.length!==0)throw new Error(`output_padding should be ${i}D`);if(t.kernelShape.reduce((s,u)=>s+u,0)>0&&t.kernelShape.length!==0&&t.kernelShape.length!==e[1].dims.length-2)throw new Error("invalid kernel shape");if(t.outputShape.length!==0&&t.outputShape.length!==e[0].dims.length-2)throw new Error("invalid output shape")},Gi=(e,t,r,n)=>{let a=e.kernelCustomData.wT??e.compute(De(t[1],[2,3,0,1]),{inputs:[1],outputs:[r.wIsConst?-2:-1]})[0];r.wIsConst&&!e.kernelCustomData.wT&&(e.kernelCustomData.wT=a);let i=[t[0],a];t.length===3&&i.push(t[2]),e.compute(xf(i,r,n),{inputs:i})},cu=(e,t)=>{let r=t.format==="NHWC",n=[e.inputs[0].reshape(r?[e.inputs[0].dims[0],1,e.inputs[0].dims[1],e.inputs[0].dims[2]]:[e.inputs[0].dims[0],e.inputs[0].dims[1],1,e.inputs[0].dims[2]]),e.inputs[1].reshape([e.inputs[1].dims[0],e.inputs[1].dims[1],1,e.inputs[1].dims[2]])];e.inputs.length===3&&n.push(e.inputs[2]);let a=t.kernelShape;(a.length===0||a[0]===0)&&(a=[e.inputs[1].dims[2]]);let i=t.dilations;(i.length===0||i[0]===0)&&(i=[1]);let s=t.strides;(s.length===0||s[0]===0)&&(s=[1]);let u=t.pads;u.length===0&&(u=[0,0]),u=[0,u[0],0,u[1]],s=[1].concat(s),i=[1].concat(i),a=[1].concat(a);let d=t.outputPadding;d=[0].concat(d);let l=ji({...t,pads:u,strides:s,dilations:i,kernelShape:a,outputPadding:d},n);Gi(e,n,l,f=>r?[f[0],f[2],f[3]]:[f[0],f[1],f[3]])},Sf=(e,t)=>{if(fu(e.inputs,t),e.inputs[0].dims.length===3)cu(e,t);else{let r=ji(t,e.inputs);Gi(e,e.inputs,r)}}}),hu,If,kf,yg=U(()=>{J(),re(),$e(),ie(),hu=(e,t,r,n)=>{let a=z.size(t),i=t.length,s=R("input",e,i),u=H("output",e,i),d=r.dataType===6?r.getInt32Array()[0]:Number(r.getBigInt64Array()[0]),l=z.normalizeAxis(d,i),f=c=>{let h=` i32(${s.indicesGet("inputIndices","uniforms.axis")}) `,g=F("uniforms.input_shape","uniforms.axis",i),y=n.reverse?h+(n.exclusive?" + 1":""):"0",b=n.reverse?g:h+(n.exclusive?"":" + 1");return`
                ${c.registerUniform("outputSize","u32").registerUniform("axis","u32").declareVariables(s,u)}
                ${c.mainStart()}
                  ${c.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
                  var inputIndices = ${u.offsetToIndices("global_idx")};
                  var sum = ${u.type.value}(0);
                  let first : i32 = ${y};
                  let last : i32 = ${b};
                  for (var i : i32 = first; i < last; i++) {
                    ${s.indicesSet("inputIndices","uniforms.axis","u32(i)")};
                    sum = sum + ${s.getByIndices("inputIndices")};
                  }
                  ${u.setByOffset("global_idx","sum")};
                }`};return{name:"CumSum",shaderCache:{hint:n.cacheKey,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:t,dataType:e}],dispatchGroup:{x:Math.ceil(a/64)},programUniforms:[{type:12,data:a},{type:12,data:l},...Z(t,t)]}),getShaderSource:f}},If=(e,t)=>{let r=e.inputs[0].dims,n=e.inputs[0].dataType,a=e.inputs[1];e.compute(hu(n,r,a,t),{inputs:[0]})},kf=e=>{let t=e.exclusive===1,r=e.reverse===1;return fe({exclusive:t,reverse:r})}}),mu,gu,yu,Ef,Cf,_g=U(()=>{J(),re(),$e(),ie(),mu=e=>{if(!e||e.length!==1)throw new Error("DepthToSpace requires 1 input.");if(e[0].dims.length!==4)throw new Error("DepthToSpace requires 4D input.")},gu=(e,t,r,n)=>{let a=[];a.push(`fn perm(i: ${n.type.indices}) -> ${r.type.indices} {
    var a: ${r.type.indices};`);for(let i=0;i<t;++i)a.push(r.indicesSet("a",e[i],`i[${i}]`));return a.push("return a;}"),a.join(`
`)},yu=(e,t)=>{let r,n,a,i,s,u,d=t.format==="NHWC",l=t.blocksize,f=t.mode==="DCR";d?([r,n,a,i]=e.dims,s=f?[r,n,a,l,l,i/l**2]:[r,n,a,i/l**2,l,l],u=f?[0,1,3,2,4,5]:[0,1,4,2,5,3]):([r,n,a,i]=[e.dims[0],e.dims[2],e.dims[3],e.dims[1]],s=f?[r,l,l,i/l**2,n,a]:[r,i/l**2,l,l,n,a],u=f?[0,3,4,1,5,2]:[0,1,4,2,5,3]);let c=e.reshape(s),h=c.dims.length,g=e.dataType,y=R("a",g,h),b=H("output",g,h),x=$=>`
  ${$.registerUniform("output_size","u32").declareVariables(y,b)}

  ${gu(u,h,y,b)}

  ${$.mainStart()}
    ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let indices = ${b.offsetToIndices("global_idx")};
    let aIndices = perm(indices);

    ${b.setByOffset("global_idx",y.getByIndices("aIndices"))}
  }`;return{name:"DepthToSpace",shaderCache:{hint:`${e.dims};${t.blocksize};${t.mode}`,inputDependencies:["rank"]},getRunData:$=>{let w=d?[r,n*l,a*l,i/l**2]:[r,i/l**2,n*l,a*l],S=z.size(w),T=c.dims,I=z.sortBasedOnPerm(T,u);return{outputs:[{dims:w,dataType:$[0].dataType}],dispatchGroup:{x:Math.ceil(S/64)},programUniforms:[{type:12,data:S},...Z(T,I)]}},getShaderSource:x}},Ef=(e,t)=>{mu(e.inputs),e.compute(yu(e.inputs[0],t))},Cf=e=>fe({blocksize:e.blocksize,mode:e.mode,format:e.format})}),Rr,er,Hi,_u,bu,wu,$u,Fi,vu,zf,Af,bg=U(()=>{J(),re(),$e(),ie(),Rr="[a-zA-Z]|\\.\\.\\.",er="("+Rr+")+",Hi="^"+er+"$",_u="("+er+",)*"+er,bu="^"+_u+"$",wu=class{constructor(e=-1){this.symbolToIndices=new Map,this.inputIndex=e}addSymbol(e,t){let r=this.symbolToIndices.get(e);r===void 0?r=[t]:r.push(t),this.symbolToIndices.set(e,r)}},$u=class{constructor(e,t){var a;this.equation=t,this.hasEllipsis=!1,this.symbolToInfo=new Map,this.lhs=new Array,this.outputDims=[];let[r,n]=t.includes("->")?t.split("->",2):[t,""];if(!r.match(RegExp(bu)))throw new Error("Invalid LHS term");if(r.split(",").forEach((i,s)=>{let u=e[s].dims.slice();if(!i.match(RegExp(Hi)))throw new Error("Invalid LHS term");let d=this.processTerm(i,!0,u,s);this.lhs.push(d)}),n==="")n+=[...this.symbolToInfo.entries()].filter(([i,s])=>s.count===1||i==="...").map(([i])=>i).join("");else if(!n.match(RegExp(er)))throw new Error("Invalid RHS");(a=n.match(RegExp(Rr,"g")))==null||a.forEach(i=>{if(i==="...")this.outputDims=this.outputDims.concat(this.ellipsisDims);else{let s=this.symbolToInfo.get(i);if(s===void 0)throw new Error("Invalid RHS symbol");this.outputDims.push(s.dimValue)}}),this.rhs=this.processTerm(n,!1,this.outputDims)}addSymbol(e,t,r){let n=this.symbolToInfo.get(e);if(n!==void 0){if(n.dimValue!==t&&n.count!==1)throw new Error("Dimension mismatch");n.count++,n.inputIndices.push(r)}else n={count:1,dimValue:t,inputIndices:[r]};this.symbolToInfo.set(e,n)}processTerm(e,t,r,n=-1){let a=r.length,i=!1,s=[],u=0;if(!e.match(RegExp(Hi))&&!t&&e!=="")throw new Error("Invalid LHS term");let d=e.match(RegExp(Rr,"g")),l=new wu(n);return d==null||d.forEach((f,c)=>{if(f==="..."){if(i)throw new Error("Only one ellipsis is allowed per input term");i=!0;let h=a-d.length+1;if(h<0)throw new Error("Ellipsis out of bounds");if(s=r.slice(u,u+h),this.hasEllipsis){if(this.ellipsisDims.length!==s.length||this.ellipsisDims.toString()!==s.toString())throw new Error("Ellipsis dimensions mismatch")}else if(t)this.hasEllipsis=!0,this.ellipsisDims=s;else throw new Error("Ellipsis must be specified in the LHS");for(let g=0;g<s.length;g++){let y=String.fromCharCode(48+g);l.addSymbol(y,c+g),this.addSymbol(y,r[u++],n)}}else l.addSymbol(f,c+(this.hasEllipsis?this.ellipsisDims.length-1:0)),this.addSymbol(f,r[u++],n)}),l}},Fi=e=>e+"_max",vu=(e,t,r,n)=>{let a=e.map(l=>l.length).map((l,f)=>R(`input${f}`,t,l)),i=z.size(n),s=H("output",t,n.length),u=[...r.symbolToInfo.keys()].filter(l=>!r.rhs.symbolToIndices.has(l)),d=l=>{let f=[],c="var prod = 1.0;",h="var sum = 0.0;",g="sum += prod;",y=[],b=[],x=[],$=[],w=r.symbolToInfo.size===r.rhs.symbolToIndices.size;r.symbolToInfo.forEach((T,I)=>{var E;if(r.rhs.symbolToIndices.has(I)){let C=(E=r.rhs.symbolToIndices.get(I))==null?void 0:E[0];C!==void 0&&r.lhs.forEach((A,O)=>{if(T.inputIndices.includes(O)){let W=A.symbolToIndices.get(I);if(W===void 0)throw new Error("Invalid symbol error");W.forEach(X=>{f.push(`${a[O].indicesSet(`input${O}Indices`,X,s.indicesGet("outputIndices",C))}`)})}})}else r.lhs.forEach((C,A)=>{if(T.inputIndices.includes(A)){let O=C.symbolToIndices.get(I);if(O===void 0)throw new Error("Invalid symbol error");O.forEach(W=>{y.push(`${a[A].indicesSet(`input${A}Indices`,W,`${I}`)}`)}),$.push(`prod *= ${a[A].getByIndices(`input${A}Indices`)};`)}}),b.push(`for(var ${I}: u32 = 0; ${I} < uniforms.${Fi(I)}; ${I}++) {`),x.push("}")});let S=w?[...f,`let sum = ${a.map((T,I)=>T.getByIndices(`input${I}Indices`)).join(" * ")};`]:[...f,h,...b,...y,c,...$,g,...x];return`
            ${l.registerUniforms(u.map(T=>({name:`${Fi(T)}`,type:"u32"}))).registerUniform("outputSize","u32").declareVariables(...a,s)}

            ${l.mainStart()}
            ${l.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
            var outputIndices = ${s.offsetToIndices("global_idx")};
            ${a.map((T,I)=>`var input${I}Indices: ${a[I].type.indices};`).join(`
`)}
            ${S.join(`
`)};
            ${s.setByOffset("global_idx","sum")};
          }`};return{name:"Einsum",shaderCache:{hint:r.equation,inputDependencies:e.map(()=>"rank")},getRunData:()=>{let l=u.filter(c=>r.symbolToInfo.has(c)).map(c=>{var h;return{type:12,data:((h=r.symbolToInfo.get(c))==null?void 0:h.dimValue)||0}});l.push({type:12,data:i});let f=e.map((c,h)=>[...Z(c)]).reduce((c,h)=>c.concat(h),l);return f.push(...Z(n)),{outputs:[{dims:n,dataType:t}],dispatchGroup:{x:Math.ceil(i/64)},programUniforms:f}},getShaderSource:d}},zf=(e,t)=>{let r=new $u(e.inputs,t.equation),n=r.outputDims,a=e.inputs.map((i,s)=>i.dims);e.compute(vu(a,e.inputs[0].dataType,r,n))},Af=e=>{let t=e.equation.replace(/\s+/g,"");return fe({equation:t})}}),xu,Ki,Tu,Su,Of,wg=U(()=>{J(),re(),ie(),xu=e=>{if(!e||e.length!==2)throw new Error("Expand requires 2 input.");let t=e[0].dims,r=Array.from(e[1].getBigInt64Array(),Number),n=r.length<t.length?0:r.length-t.length,a=t.length<r.length?0:t.length-r.length;for(;n<r.length&&a<t.length;++n,++a)if(r[n]!==t[a]&&r[n]!==1&&t[a]!==1)throw new Error("Expand requires shape to be broadcastable to input")},Ki=(e,t)=>{let r=e.length-t.length,n=[];for(let a=0;a<r;++a)n.push(e[a]);for(let a=0;a<t.length;++a)n.push(t[a]===1?e[a+r]:t[a]);return n},Tu=(e,t)=>e.length>t.length?Ki(e,t):Ki(t,e),Su=e=>{let t=e[0].dims,r=Array.from(e[1].getBigInt64Array(),Number),n=Tu(t,r),a=e[0].dataType,i=a===9||z.size(t)===1,s=a===9||t.length>0&&t[t.length-1]%4===0?4:1,u=i||n.length>0&&n[n.length-1]%4===0?4:1,d=Math.ceil(z.size(n)/u),l=c=>{let h=R("input",a,t.length,s),g=H("output",a,n.length,u),y;if(a===9){let b=(x,$,w="")=>`
          let outputIndices${$} = ${g.offsetToIndices(`outputOffset + ${$}u`)};
          let offset${$} = ${h.broadcastedIndicesToOffset(`outputIndices${$}`,g)};
          let index${$} = offset${$} / 4u;
          let component${$} = offset${$} % 4u;
          ${x}[${$}] = ${w}(${h.getByOffset(`index${$}`)}[component${$}]);
        `;y=`
        let outputOffset = global_idx * ${u};
        var data = vec4<u32>(0);
        ${b("data",0,"u32")}
        ${b("data",1,"u32")}
        ${b("data",2,"u32")}
        ${b("data",3,"u32")}
        ${g.setByOffset("global_idx","data")}
      }`}else y=`
        let outputIndices = ${g.offsetToIndices(`global_idx * ${u}`)};
        let inputOffset = ${h.broadcastedIndicesToOffset("outputIndices",g)};
        let data = ${g.type.value}(${h.getByOffset(`inputOffset / ${s}`)});
        ${g.setByOffset("global_idx","data")}
      }`;return`
    ${c.registerUniform("vec_size","u32").declareVariables(h,g)}
    ${c.mainStart()}
    ${c.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
    ${y}`},f=[{type:12,data:d},...Z(t,n)];return{name:"Expand",shaderCache:{hint:`${n.length};${s}${u}`,inputDependencies:["rank"]},getShaderSource:l,getRunData:()=>({outputs:[{dims:n,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:f})}},Of=e=>{xu(e.inputs),e.compute(Su(e.inputs),{inputs:[0]})}}),Iu,Bf,$g=U(()=>{J(),re(),ie(),Yn(),Iu=e=>{let t=e[0].dataType,r=z.size(e[0].dims),n=z.size(e[1].dims),a=n%4===0,i=s=>{let u=R("x",t,[1],4),d=R("bias",t,[1],4),l=H("y",t,[1],4),f=[{name:"output_vec_size",type:"u32"},{name:"bias_size",type:"u32"}],c=g=>`
      let bias${g}_offset: u32 = (global_idx * 4 + ${g}) % uniforms.bias_size;
      let bias${g} = ${d.getByOffset(`bias${g}_offset / 4`)}[bias${g}_offset % 4];`,h=a?`
      let bias = ${d.getByOffset("global_idx % (uniforms.bias_size / 4)")};`:`${c(0)}${c(1)}${c(2)}${c(3)}
      let bias = ${u.type.value}(bias0, bias1, bias2, bias3);`;return`${s.registerUniforms(f).declareVariables(u,d,l)}

    ${In(Ee(t))}

    ${s.mainStart(qt)}
      ${s.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_vec_size")}

      let x = ${u.getByOffset("global_idx")};
      ${h}
      let x_in = x + bias;
      ${l.setByOffset("global_idx",kn("x_in"))}
    }`};return{name:"FastGeluWithBias",shaderCache:{hint:`${a}`,inputDependencies:["type","type"]},getShaderSource:i,getRunData:s=>({outputs:[{dims:s[0].dims,dataType:s[0].dataType}],programUniforms:[{type:12,data:Math.ceil(r/4)},{type:12,data:n}],dispatchGroup:{x:Math.ceil(r/qt/4)}})}},Bf=e=>{e.inputs.length<2||z.size(e.inputs[1].dims)===0?Yp(e):e.compute(Iu(e.inputs))}}),ku,Eu,Rf,Df,vg=U(()=>{J(),re(),$e(),ie(),ku=e=>{if(!e||e.length!==2)throw new Error("Gather requires 2 inputs.")},Eu=(e,t)=>{let r=e[0].dims,n=e[1].dims,a=r.length,i=z.normalizeAxis(t.axis,a),s=r.slice(0);s.splice(i,1,...n);let u=r[i],d=e[0].dataType===9?4:1,l=Math.ceil(z.size(s)/d),f=[{type:12,data:l},{type:6,data:u},{type:12,data:i},...Z(e[0].dims,e[1].dims,s)],c=h=>{let g=R("data",e[0].dataType,e[0].dims.length,d),y=R("inputIndices",e[1].dataType,e[1].dims.length),b=H("output",e[0].dataType,s.length,d),x=w=>{let S=n.length,T=`var indicesIndices${w}  = ${y.type.indices}(0);`;for(let I=0;I<S;I++)T+=`${S>1?`indicesIndices${w}[${I}]`:`indicesIndices${w}`} = ${s.length>1?`outputIndices${w}[uniforms.axis + ${I}]`:`outputIndices${w}`};`;T+=`
          var idx${w} = ${y.getByIndices(`indicesIndices${w}`)};
          if (idx${w} < 0) {
            idx${w} = idx${w} + uniforms.axisDimLimit;
          }
          var dataIndices${w} : ${g.type.indices};
        `;for(let I=0,E=0;I<a;I++)I===i?(T+=`${a>1?`dataIndices${w}[${I}]`:`dataIndices${w}`} = u32(idx${w});`,E+=S):(T+=`${a>1?`dataIndices${w}[${I}]`:`dataIndices${w}`} = ${s.length>1?`outputIndices${w}[${E}]`:`outputIndices${w}`};`,E++);return T},$;if(e[0].dataType===9){let w=(S,T,I="")=>`
          let outputIndices${T} = ${b.offsetToIndices(`outputOffset + ${T}u`)};
          ${x(T)};
          let offset${T} = ${g.indicesToOffset(`dataIndices${T}`)};
          let index${T} = offset${T} / 4u;
          let component${T} = offset${T} % 4u;
          ${S}[${T}] = ${I}(${g.getByOffset(`index${T}`)}[component${T}]);
        `;$=`
        let outputOffset = global_idx * ${d};
        var value = vec4<u32>(0);
        ${w("value",0,"u32")}
        ${w("value",1,"u32")}
        ${w("value",2,"u32")}
        ${w("value",3,"u32")}
        ${b.setByOffset("global_idx","value")}
      `}else $=`
      let outputIndices = ${b.offsetToIndices("global_idx")};
      ${x("")};
      let value = ${g.getByIndices("dataIndices")};
      ${b.setByOffset("global_idx","value")};
      `;return`
      ${h.registerUniform("outputSize","u32").registerUniform("axisDimLimit","i32").registerUniform("axis","u32").declareVariables(g,y,b)}
      ${h.mainStart()}
        ${h.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        ${$}
      }`};return{name:"Gather",shaderCache:{hint:t.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:s,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:f}),getShaderSource:c}},Rf=e=>fe({axis:e.axis}),Df=(e,t)=>{let r=e.inputs;ku(r),e.compute(Eu(e.inputs,t))}}),Cu,Nf,Mf,xg=U(()=>{J(),re(),ie(),Cu=(e,t,r,n,a,i,s,u,d)=>{let l=[{type:12,data:i},{type:12,data:n},{type:12,data:a},{type:12,data:r},{type:12,data:s},{type:12,data:u},{type:12,data:d}],f=[i];l.push(...Z(t.dims,f));let c=h=>{let g=R("indices_data",t.dataType,t.dims.length),y=H("input_slice_offsets_data",12,1,1),b=[g,y],x=[{name:"output_size",type:"u32"},{name:"batch_dims",type:"u32"},{name:"input_dims",type:"u32",length:a.length},{name:"sizes_from_slice_dims_data",type:"u32",length:r.length},{name:"num_slices_per_batch",type:"u32"},{name:"input_batch_stride",type:"u32"},{name:"num_slice_dims",type:"u32"}];return`
  ${h.registerUniforms(x).declareVariables(...b)}
  ${h.mainStart()}
    ${h.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let batch_idx = global_idx / uniforms.num_slices_per_batch;
    let base_offset = batch_idx * uniforms.input_batch_stride;

    let slice_indices_base_offset = global_idx * uniforms.num_slice_dims;
    var relative_slice_offset = 0;
    for (var dim_idx = 0u; dim_idx < uniforms.num_slice_dims; dim_idx ++) {
      var index = i32(indices_data[dim_idx + slice_indices_base_offset].x);
      let input_dim_idx = uniforms.batch_dims + dim_idx;
      if (index < 0) {
        ${a.length===1?"index += i32(uniforms.input_dims);":"index += i32(uniforms.input_dims[input_dim_idx]);"}
      }
      ${r.length===1?"relative_slice_offset += index * i32(uniforms.sizes_from_slice_dims_data);":"relative_slice_offset += index * i32(uniforms.sizes_from_slice_dims_data[dim_idx]);"}
    }

    input_slice_offsets_data[global_idx] =  base_offset + u32(relative_slice_offset);
  }`};return e.compute({name:"computeSliceOffsets",shaderCache:{hint:`${a.length}_${r.length}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:f,dataType:e.inputs[1].dataType}],dispatchGroup:{x:Math.ceil(i/64)},programUniforms:l}),getShaderSource:c},{inputs:[t],outputs:[-1]})[0]},Nf=(e,t)=>{let r=e.inputs,n=r[0].dims,a=r[0].dataType,i=r[1].dims,s=i[i.length-1],u=z.sizeToDimension(i,i.length-1),d=z.sizeFromDimension(n,t.batchDims+s),l=z.sizeToDimension(n,t.batchDims),f=z.sizeFromDimension(n,t.batchDims),c=u/l,h=new Array(s),g=d;for(let T=0;T<s;++T)h[s-1-T]=g,g*=n[t.batchDims+s-1-T];let y=Cu(e,r[1],h,t.batchDims,n,u,c,f,s),b=t.batchDims+s;if(b>n.length)throw new Error("last dimension of indices must not be larger than rank of input tensor");let x=i.slice(0,-1).concat(n.slice(b)),$=z.size(x),w=[{type:12,data:$},{type:12,data:d},...Z(r[0].dims,y.dims,x)],S=T=>{let I=R("data",r[0].dataType,r[0].dims.length),E=R("slice_offsets",12,y.dims.length),C=H("output",r[0].dataType,x.length);return`
          ${T.registerUniform("output_size","u32").registerUniform("slice_size","u32").declareVariables(I,E,C)}
            ${T.mainStart()}
            ${T.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let slice_offset = slice_offsets[global_idx / uniforms.slice_size];
          output[global_idx] = data[u32(slice_offset) + global_idx % uniforms.slice_size];
        }`};e.compute({name:"GatherND",shaderCache:{hint:t.cacheKey,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:x,dataType:a}],dispatchGroup:{x:Math.ceil($/64)},programUniforms:w}),getShaderSource:S},{inputs:[r[0],y]})},Mf=e=>({batchDims:e.batch_dims,cacheKey:""})}),zu,Au,Pf,Uf,Tg=U(()=>{J(),re(),$e(),ie(),zu=(e,t)=>{if(e.length<3||e.length>4)throw new Error("GatherBlockQuantized requires 3 or 4 inputs.");let r=z.normalizeAxis(t.quantizeAxis,e[0].dims.length),n=t.blockSize,a=e[0],i=e[2],s=e.length===4?e[3]:void 0;if(i.dims.length!==a.dims.length||!a.dims.map((u,d)=>d===r?Math.ceil(u/n)===i.dims[d]:u===i.dims[d]).reduce((u,d)=>u&&d,!0))throw new Error("Scales must have the same rank as the input tensor and the dims should match except on gatherAxis.");if(s){if(s.dataType!==a.dataType)throw new Error("Zero point must have the same data type as the input tensor.");if(s.dims.length!==i.dims.length||!s.dims.map((u,d)=>u===i.dims[d]).reduce((u,d)=>u&&d,!0))throw new Error("Zero point must have the same rank as the input tensor and the dims should match except on quantizeAxis.")}},Au=(e,t)=>{let r=e[0].dims,n=e[1].dims,a=r.length,i=z.normalizeAxis(t.gatherAxis,a),s=z.normalizeAxis(t.quantizeAxis,a),u=r.slice(0);u.splice(i,1,...n);let d=z.size(u),l=e[2].dataType,f=e[0].dataType===22,c=[{type:12,data:d},{type:12,data:s},{type:12,data:i},{type:12,data:t.blockSize},...Z(...e.map((g,y)=>g.dims),u)],h=g=>{let y=R("data",e[0].dataType,e[0].dims.length),b=R("inputIndices",e[1].dataType,e[1].dims.length),x=R("scales",e[2].dataType,e[2].dims.length),$=e.length>3?R("zeroPoint",e[3].dataType,e[3].dims.length):void 0,w=H("output",l,u.length),S=[y,b,x];$&&S.push($);let T=[{name:"output_size",type:"u32"},{name:"quantize_axis",type:"u32"},{name:"gather_axis",type:"u32"},{name:"block_size",type:"u32"}];return`
        ${g.registerUniforms(T).declareVariables(...S,w)}
        ${g.mainStart()}
        let output_indices = ${w.offsetToIndices("global_idx")};
        var indices_indices = ${b.type.indices}(0);
        ${n.length>1?`
          for (var i: u32 = 0; i < ${n.length}; i++) {
            let index = ${w.indicesGet("output_indices","uniforms.gather_axis + i")};
            ${b.indicesSet("indices_indices","i","index")};
          }`:`indices_indices = ${w.indicesGet("output_indices","uniforms.gather_axis")};`};
        var data_indices = ${y.type.indices}(0);
        for (var i: u32 = 0; i < uniforms.gather_axis; i++) {
          let index = ${w.indicesGet("output_indices","i")};
          ${y.indicesSet("data_indices","i","index")};
        }
        var index_from_indices = ${b.getByIndices("indices_indices")};
        if (index_from_indices < 0) {
          index_from_indices += ${r[i]};
        }
        ${y.indicesSet("data_indices","uniforms.gather_axis","u32(index_from_indices)")};
        for (var i = uniforms.gather_axis + 1; i < ${u.length}; i++) {
          let index = ${w.indicesGet("output_indices",`i + ${n.length} - 1`)};
          ${y.indicesSet("data_indices","i","index")};
        }
        let data_offset = ${y.indicesToOffset("data_indices")};
        let data_index = data_offset % 8;
        // Convert 4-bit packed data to 8-bit packed data.
        let packed_4bit_quantized_data = ${y.getByOffset("data_offset / 8")};
        let packed_8bit_quantized_data = (packed_4bit_quantized_data >> (4 * (data_index % 2))) & 0x0f0f0f0f;
        let quantized_data_vec = ${f?"unpack4xI8":"unpack4xU8"}(u32(packed_8bit_quantized_data));
        let quantized_data = quantized_data_vec[data_index / 2];
        var scale_indices = data_indices;
        let quantize_axis_index = ${x.indicesGet("data_indices","uniforms.quantize_axis")} / uniforms.block_size;
        ${x.indicesSet("scale_indices","uniforms.quantize_axis","quantize_axis_index")};
        var scale = ${x.getByIndices("scale_indices")};
        ${$?`
              let zero_point_indices = scale_indices;
              let zero_point_offset = ${$.indicesToOffset("zero_point_indices")};
              let zero_point_index = zero_point_offset % 8;
              let packed_4bit_zero_points = ${$.getByOffset("zero_point_offset / 8")};
              let packed_8bit_zero_points = (packed_4bit_zero_points >> (4 * (zero_point_index % 2))) & 0x0f0f0f0f;
              let zero_point_vec = ${f?"unpack4xI8":"unpack4xU8"}(u32(packed_8bit_zero_points));
              let zero_point = zero_point_vec[zero_point_index / 2];`:"var zero_point = 0"};
        let dequantized_data = ${Ee(l)}(quantized_data - zero_point) * scale;
        ${w.setByOffset("global_idx","dequantized_data")};
    }`};return{name:"GatherBlockQuantized",shaderCache:{hint:`${t.cacheKey};${e.filter((g,y)=>y!==1).map(g=>g.dims.join("_")).join(";")}`,inputDependencies:Array.from({length:e.length},(g,y)=>"rank")},getRunData:()=>({outputs:[{dims:u,dataType:l}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:c}),getShaderSource:h}},Pf=(e,t)=>{let r=e.inputs;zu(r,t),e.compute(Au(e.inputs,t))},Uf=e=>fe({blockSize:e.blockSize,gatherAxis:e.gatherAxis,quantizeAxis:e.quantizeAxis})}),Ou,Bu,Wf,Lf,Sg=U(()=>{J(),re(),$e(),ie(),Ou=e=>{if(!e||e.length!==2)throw new Error("GatherElements requires 2 inputs.");if(e[0].dims.length<1)throw new Error("GatherElements requires that the data input be rank >= 1.");if(e[0].dims.length!==e[1].dims.length)throw new Error(`GatherElements requires that the data input and
                     indices input tensors be of same rank.`)},Bu=(e,t)=>{let r=e[0].dims,n=e[0].dataType,a=r.length,i=e[1].dims,s=e[1].dataType,u=z.normalizeAxis(t.axis,a),d=r[u],l=i.slice(0),f=z.size(l),c=R("input",n,a),h=R("indicesInput",s,i.length),g=H("output",n,l.length),y=[{type:12,data:f},{type:6,data:d},{type:12,data:u}];return y.push(...Z(r,i,l)),{name:"GatherElements",shaderCache:{inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:l,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:y}),getShaderSource:b=>`
      ${b.registerUniform("outputSize","u32").registerUniform("axisDimLimit","i32").registerUniform("axis","u32").declareVariables(c,h,g)}
      ${b.mainStart()}
      ${b.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

      let outputIndices = ${g.offsetToIndices("global_idx")};

      var idx = ${h.getByOffset("global_idx")};
      if (idx < 0) {
        idx = idx + uniforms.axisDimLimit;
      }
      var inputIndices = ${c.type.indices}(outputIndices);
      ${c.indicesSet("inputIndices","uniforms.axis","u32(idx)")};
      let value = ${c.getByIndices("inputIndices")};

      ${g.setByOffset("global_idx","value")};
  }`}},Wf=e=>fe({axis:e.axis}),Lf=(e,t)=>{let r=e.inputs;Ou(r),e.compute(Bu(e.inputs,t))}}),Ru,Du,qf,Vf,Ig=U(()=>{J(),re(),ie(),Ru=e=>{if(!e)throw new Error("Input is missing");if(e.length<2||e.length>3)throw new Error("Invaid input number.");if(e.length===3&&e[2].dims.length>2)throw new Error("Invalid input shape of C");if(e[0].dataType!==e[1].dataType||e.length===3&&e[0].dataType!==e[2].dataType)throw new Error("Input types are mismatched")},Du=(e,t)=>{let r=e[0].dims.slice(),n=e[1].dims.slice(),[a,i,s]=Ud.getShapeOfGemmResult(r,t.transA,n,t.transB,e.length===3?e[2].dims:void 0),u=[a,i];if(!u)throw new Error("Can't use gemm on the given tensors");let d=16,l=Math.ceil(i/d),f=Math.ceil(a/d),c=!0,h=z.size(u),g=[{type:12,data:c?l:h},{type:12,data:a},{type:12,data:i},{type:12,data:s},{type:1,data:t.alpha},{type:1,data:t.beta}],y=["type","type"];e.length===3&&(g.push(...Z(e[2].dims)),y.push("rank")),g.push(...Z(u));let b=$=>{let w="";t.transA&&t.transB?w="value += a[k * uniforms.M + m] * b[n * uniforms.K + k];":t.transA&&!t.transB?w="value += a[k * uniforms.M + m] * b[k * uniforms.N + n];":!t.transA&&t.transB?w="value += a[m * uniforms.K + k] * b[n * uniforms.K + k];":!t.transA&&!t.transB&&(w="value += a[m * uniforms.K + k] * b[k * uniforms.N + n];");let S=t.alpha===1?"":"value *= uniforms.alpha;",T=R("a",e[0].dataType,e[0].dims),I=R("b",e[1].dataType,e[1].dims),E=T.type.value,C=null,A=[T,I];e.length===3&&(C=R("c",e[2].dataType,e[2].dims.length),A.push(C));let O=H("output",e[0].dataType,u.length);A.push(O);let W=[{name:"output_size",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"},{name:"alpha",type:"f32"},{name:"beta",type:"f32"}];return`
  ${$.registerUniforms(W).declareVariables(...A)}

  ${$.mainStart()}
    ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

    let m = global_idx / uniforms.N;
    let n = global_idx % uniforms.N;

    var value = ${E}(0);
    for (var k: u32 = 0u; k < uniforms.K; k++) {
      ${w}
    }

    ${S}
    ${C!=null?`let cOffset = ${C.broadcastedIndicesToOffset("vec2(m, n)",O)}; value += ${E}(uniforms.beta) * ${C.getByOffset("cOffset")};`:""}
    output[global_idx] = value;
  }`},x=$=>{let w=R("a",e[0].dataType,e[0].dims),S=R("b",e[1].dataType,e[1].dims),T=null,I=[w,S];e.length===3&&(T=R("c",e[2].dataType,e[2].dims.length),I.push(T));let E=H("output",e[0].dataType,u.length);I.push(E);let C=[{name:"num_tile_n",type:"u32"},{name:"M",type:"u32"},{name:"N",type:"u32"},{name:"K",type:"u32"},{name:"alpha",type:"f32"},{name:"beta",type:"f32"}],A="",O="";t.transA&&t.transB?(O=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${w.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${S.type.value}(0);
      }
      `,A="value += tile_a[k][local_id.y] * tile_b[local_id.x][k];"):t.transA&&!t.transB?(O=`
      var col = tile_row_start + local_id.x;
      var row = k_start + local_id.y;
      if (col < uniforms.M && row < uniforms.K) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.M + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${w.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${S.type.value}(0);
      }
      `,A="value += tile_a[k][local_id.y] * tile_b[k][local_id.x];"):!t.transA&&t.transB?(O=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${w.type.value}(0);
      }

      col = k_start + local_id.x;
      row = tile_col_start + local_id.y;
      if (col < uniforms.K && row < uniforms.N) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.K + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${S.type.value}(0);
      }
      `,A="value += tile_a[local_id.y][k] * tile_b[local_id.x][k];"):!t.transA&&!t.transB&&(O=`
      var col = k_start + local_id.x;
      var row = tile_row_start + local_id.y;
      if (col < uniforms.K && row < uniforms.M) {
        tile_a[local_id.y][local_id.x] = a[row * uniforms.K + col];
      } else {
        tile_a[local_id.y][local_id.x] = ${w.type.value}(0);
      }

      col = tile_col_start + local_id.x;
      row = k_start + local_id.y;
      if (col < uniforms.N && row < uniforms.K) {
        tile_b[local_id.y][local_id.x] = b[row * uniforms.N + col];
      } else {
        tile_b[local_id.y][local_id.x] = ${S.type.value}(0);
      }
      `,A="value += tile_a[local_id.y][k] * tile_b[k][local_id.x];");let W=t.alpha===1?"":"value *= uniforms.alpha;";return`
  ${$.registerUniforms(C).declareVariables(...I)}
  var<workgroup> tile_a: array<array<${w.type.storage}, ${d}>, ${d}>;
  var<workgroup> tile_b: array<array<${S.type.storage}, ${d}>, ${d}>;
  ${$.mainStart([d,d,1])}
    let tile_col_start = (workgroup_index % uniforms.num_tile_n) * ${d};
    let tile_row_start = (workgroup_index / uniforms.num_tile_n) * ${d};
    let num_tiles = (uniforms.K - 1) / ${d} + 1;
    var k_start = 0u;
    var value = ${E.type.value}(0);
    for (var t: u32 = 0u; t < num_tiles; t++) {
      ${O}
      k_start = k_start + ${d};
      workgroupBarrier();

      for (var k: u32 = 0u; k < ${d}; k++) {
        ${A}
      }
      workgroupBarrier();
    }

    ${W}
    let m = tile_row_start + local_id.y;
    let n = tile_col_start + local_id.x;
    ${T!=null?`let cOffset = ${T.broadcastedIndicesToOffset("vec2(m, n)",E)}; value += ${E.type.value}(uniforms.beta) * ${T.getByOffset("cOffset")};`:""}
    if (m < uniforms.M && n < uniforms.N) {
      output[m * uniforms.N + n] = value;
    }
  }`};return c?{name:"GemmShared",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:y},getRunData:()=>({outputs:[{dims:u,dataType:e[0].dataType}],dispatchGroup:{x:l*f},programUniforms:g}),getShaderSource:x}:{name:"Gemm",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:y},getRunData:()=>({outputs:[{dims:u,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(h/64)},programUniforms:g}),getShaderSource:b}},qf=e=>{let t=e.transA,r=e.transB,n=e.alpha,a=e.beta;return{transA:t,transB:r,alpha:n,beta:a,cacheKey:`${e.transA};${e.transB};${e.alpha===1}`}},Vf=(e,t)=>{Ru(e.inputs),e.compute(Du(e.inputs,t))}}),tt,nt,$t,vt,Nu,Mu,Pu,Uu,Wu,Lu,qu,Vu,jf,Gf,kg=U(()=>{J(),re(),$e(),ie(),[tt,nt,$t,vt]=[0,1,2,3],Nu=e=>{if(e[0].dims.length!==4)throw new Error("only 4-D tensor is supported.");if(e[0].dims.length!==e[1].dims.length)throw new Error("input dimensions must be equal to grid dimensions");if(e[0].dims.length-2!==e[1].dims[e[1].dims.length-1])throw new Error(`last dimension of grid must be equal to ${e[0].dims.length-2}`);if(e[0].dims[0]!==e[1].dims[0])throw new Error("grid batch size must match input batch size")},Mu=`
  fn gs_get_cubic_coeffs(x: f32) -> vec4<f32> {
    let cubic_alpha = -0.75f;
    let x_abs = abs(x);
    var coeffs: vec4<f32>;
    coeffs[0] = (((cubic_alpha * (x_abs + 1) - 5 * cubic_alpha) * (x_abs + 1) + 8 * cubic_alpha) * (x_abs + 1) - 4 * cubic_alpha);
    coeffs[1] = (((cubic_alpha + 2) * x_abs - (cubic_alpha + 3)) * x_abs * x_abs + 1);
    coeffs[2] = (((cubic_alpha + 2) * (1 - x_abs) - (cubic_alpha + 3)) * (1 - x_abs) * (1 - x_abs) + 1);
    coeffs[3] = (((cubic_alpha * (2 - x_abs) - 5 * cubic_alpha) * (2 - x_abs) + 8 * cubic_alpha) * (2 - x_abs) - 4 * cubic_alpha);
    return coeffs;
  }
`,Pu=e=>`
  fn gs_bicubic_interpolate(p: mat4x4<${e}>, x: f32, y: f32) -> ${e} {
    var v: vec4<f32>;
    var coeffs = gs_get_cubic_coeffs(x);
    for (var i = 0; i < 4; i++) {
      v[i] = coeffs[0] * p[i][0] + coeffs[1] * p[i][1] + coeffs[2] * p[i][2] + coeffs[3] * p[i][3];
    }
    coeffs = gs_get_cubic_coeffs(y);
    let pixel = ${e}(coeffs[0] * v[0] + coeffs[1] * v[1] + coeffs[2] * v[2] + coeffs[3] * v[3]);
    return pixel;
  }
`,Uu=e=>`
  fn gs_denormalize(n: f32, length: i32) -> f32 {
    ${e.alignCorners===0?`
    // alignCorners: false => [-1, 1] to [-0.5, length - 0.5]
    return ((n + 1.0) * f32(length) - 1.0) / 2.0;
    `:`
    // alignCorners: true => [-1, 1] to [0, length - 1]
    return (n + 1.0) / 2.0 * (f32(length - 1));
    `}
  }
`,Wu=e=>`
  ${e.paddingMode==="reflection"?`
      fn gs_reflect(x: i32, x_min: f32, x_max: f32) -> u32 {
        var dx = 0.0;
        var fx = f32(x);
        let range = x_max - x_min;
        if (fx < x_min) {
          dx = x_min - fx;
          let n = u32(dx / range);
          let r = dx - f32(n) * range;
          if (n % 2 == 0) {
            fx = x_min + r;
          } else {
            fx = x_max - r;
          }
        } else if (fx > x_max) {
          dx = fx - x_max;
          let n = u32(dx / range);
          let r = dx - f32(n) * range;
          if (n % 2 == 0) {
            fx = x_max - r;
          } else {
            fx = x_min + r;
          }
        }
        return u32(fx);
      }`:""}
`,Lu=(e,t,r)=>`
  fn pixel_at_grid(r: i32, c: i32, H: i32, W: i32, batch: u32, channel: u32, border: vec4<f32>) -> ${t} {
     var pixel = ${t}(0);
     var indices = vec4<u32>(0);
     indices[${tt}] = batch;
     indices[${nt}] = channel;`+(()=>{switch(r.paddingMode){case"zeros":return`
          if (r >= 0 && r < H && c >=0 && c < W) {
            indices[${$t}] = u32(r);
            indices[${vt}] = u32(c);
          } else {
            return ${t}(0);
          }
        `;case"border":return`
          indices[${$t}] = u32(clamp(r, 0, H - 1));
          indices[${vt}] = u32(clamp(c, 0, W - 1));
        `;case"reflection":return`
          indices[${$t}] = gs_reflect(r, border[1], border[3]);
          indices[${vt}] = gs_reflect(c, border[0], border[2]);
        `;default:throw new Error(`padding mode ${r.paddingMode} is not supported`)}})()+`
    return ${e.getByIndices("indices")};
  }
`,qu=(e,t,r)=>(()=>{switch(r.mode){case"nearest":return`
          let result = pixel_at_grid(i32(round(y)), i32(round(x)), H_in, W_in, indices[${tt}], indices[${nt}], border);
        `;case"bilinear":return`
          let x1 = i32(floor(x));
          let y1 = i32(floor(y));
          let x2 = x1 + 1;
          let y2 = y1 + 1;

          let p11 = pixel_at_grid(y1, x1, H_in, W_in, indices[${tt}], indices[${nt}], border);
          let p12 = pixel_at_grid(y1, x2, H_in, W_in, indices[${tt}], indices[${nt}], border);
          let p21 = pixel_at_grid(y2, x1, H_in, W_in, indices[${tt}], indices[${nt}], border);
          let p22 = pixel_at_grid(y2, x2, H_in, W_in, indices[${tt}], indices[${nt}], border);

          let dx2 = ${t}(f32(x2) - x);
          let dx1 = ${t}(x - f32(x1));
          let dy2 = ${t}(f32(y2) - y);
          let dy1 = ${t}(y - f32(y1));
          let result = dy2 * (dx2 * p11 + dx1 * p12) + dy1 * (dx2 * p21 + dx1 * p22);
        `;case"bicubic":return`
          let x0 = i32(floor(x)) - 1;
          let y0 = i32(floor(y)) - 1;
          var p: mat4x4<${t}>;
          for (var h = 0; h < 4; h++) {
            for (var w = 0; w < 4; w++) {
              p[h][w] = pixel_at_grid(h + y0, w + x0, H_in, W_in, indices[${tt}], indices[${nt}], border);
            }
          }

          let dx = x - f32(x0 + 1);
          let dy = y - f32(y0 + 1);
          let result = gs_bicubic_interpolate(p, dx, dy);
        `;default:throw new Error(`mode ${r.mode} is not supported`)}})()+`${e.setByOffset("global_idx","result")}`,Vu=(e,t)=>{let r=R("x",e[0].dataType,e[0].dims.length),n=[e[1].dims[0],e[1].dims[1],e[1].dims[2]],a=R("grid",e[1].dataType,n.length,2),i=[e[0].dims[0],e[0].dims[1],e[1].dims[1],e[1].dims[2]];t.format==="NHWC"&&(i=[e[0].dims[0],e[1].dims[1],e[1].dims[2],e[0].dims[3]],[tt,nt,$t,vt]=[0,3,1,2]);let s=H("output",e[0].dataType,i.length),u=r.type.value,d=z.size(i),l=[{type:12,data:d},...Z(e[0].dims,n,i)],f=c=>`
  ${c.registerUniform("output_size","u32").declareVariables(r,a,s)}
  ${Mu}
  ${Pu(u)}
  ${Uu(t)}
  ${Wu(t)}
  ${Lu(r,u,t)}

  ${c.mainStart()}
    ${c.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let H_in = i32(uniforms.x_shape[${$t}]);
      let W_in = i32(uniforms.x_shape[${vt}]);

      ${t.alignCorners===0?`
      let x_min = -0.5;
      let x_max = f32(W_in) - 0.5;
      let y_min = -0.5;
      let y_max = f32(H_in) - 0.5;
      `:`
      let x_min = 0.0;
      let x_max = f32(W_in) - 1.0;
      let y_min = 0.0;
      let y_max = f32(H_in) - 1.0;
      `};
      let border = vec4<f32>(x_min, y_min, x_max, y_max);

      let indices = ${s.offsetToIndices("global_idx")};
      var grid_indices = vec3<u32>(indices[${tt}], indices[${$t}], indices[${vt}]);
      let nxy = ${a.getByIndices("grid_indices")};
      var x = gs_denormalize(f32(nxy[0]), W_in);
      var y = gs_denormalize(f32(nxy[1]), H_in);

      ${qu(s,u,t)}
  }`;return{name:"GridSample",shaderCache:{hint:`${t.cacheKey}`,inputDependencies:["type","type"]},getRunData:c=>{let h=z.size(i);return{outputs:[{dims:i,dataType:c[0].dataType}],dispatchGroup:{x:Math.ceil(h/64)},programUniforms:l}},getShaderSource:f}},jf=(e,t)=>{Nu(e.inputs),e.compute(Vu(e.inputs,t))},Gf=e=>fe({alignCorners:e.align_corners,mode:e.mode,paddingMode:e.padding_mode,format:e.format})}),Ce,ju,Hf,Zi,Gu,ur,Ff,Kf=U(()=>{J(),re(),$e(),Kn(),Xn(),ie(),yt(),Ce=(e,t)=>e.length>t&&e[t].dims.length>0?e[t]:void 0,ju=(e,t)=>{let r=e[0],n=Ce(e,1),a=Ce(e,2),i=Ce(e,3),s=Ce(e,4),u=Ce(e,5),d=Ce(e,6),l=Ce(e,7);if(r.dims.length!==3&&r.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let f=r.dims[0],c=r.dims[1],h=r.dims.length===3?r.dims[2]:t.numHeads*r.dims[4],g=c,y=0,b=0,x=Math.floor(h/t.numHeads);if(d&&l&&z.size(d.dims)&&z.size(l.dims)){if(d.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(d.dims[0]!==f||d.dims[1]!==t.numHeads||d.dims[3]!==x)throw new Error('Input "past_key" shape (batch_size, num_heads, past_sequence_length, head_size)');if(l.dims[0]!==f||l.dims[1]!==t.numHeads||l.dims[3]!==x)throw new Error('Input "past_value" shape (batch_size, num_heads, past_sequence_length, head_size)');if(d.dims[2]!==l.dims[2])throw new Error('Input "past_key" and "past_value" shall have same dim 2 (past_sequence_length)');if(l.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');y=d.dims[2],b=d.dims[2]}else if(d&&z.size(d.dims)||l&&z.size(l.dims))throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let $;if(n&&z.size(n.dims)>0){if(r.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(n.dims.length<3||n.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(r.dims[0]!==n.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(n.dims.length===3){if(n.dims[2]!==r.dims[2])throw new Error('Input "query" and "key" shall have same dim 2 (hidden_size)');$=2,g=n.dims[1]}else if(n.dims.length===5){if(n.dims[2]!==t.numHeads||n.dims[3]!==2||n.dims[4]!==x)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(a)throw new Error('Expect "value" be none when "key" has packed kv format.');$=5,g=n.dims[1]}else{if(n.dims[1]!==t.numHeads||n.dims[3]!==x)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');$=0,g=n.dims[2]}}else{if(r.dims.length!==5)throw new Error('Input "query" is expected to have 5 dimensions when key is empty');if(r.dims[2]!==t.numHeads||r.dims[3]!==3)throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');$=3}if(i&&z.size(i.dims)>0){if(i.dims.length!==1)throw new Error('Input "bias" is expected to have 1 dimension');if(n&&n.dims.length===5&&n.dims[3]===2)throw new Error("bias is not allowed for packed kv.")}let w=y+g,S=0;if(s&&z.size(s.dims)>0){S=8;let C=s.dims;throw C.length===1?C[0]===f?S=1:C[0]===3*f+2&&(S=3):C.length===2&&C[0]===f&&C[1]===w&&(S=5),S===8?new Error('Input "key_padding_mask" shape shall be (batch_size) or (batch_size, total_sequence_length)'):new Error("Mask not supported")}let T=!1,I=h;if(a&&z.size(a.dims)>0){if(a.dims.length!==3&&a.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(r.dims[0]!==a.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(a.dims.length===3){if(g!==a.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');I=a.dims[2]}else{if(g!==a.dims[2])throw new Error('Input "key" and "value" shall have the same dim 2 (kv_sequence_length)');I=a.dims[1]*a.dims[3],T=!0}}let E=!1;if(s&&z.size(s.dims)>0)throw new Error("Key padding mask is not supported");if(u&&z.size(u.dims)>0){if(u.dims.length!==4)throw new Error('Input "attention_bias" is expected to have 4 dimensions');if(u.dims[0]!==f||u.dims[1]!==t.numHeads||u.dims[2]!==c||u.dims[3]!==w)throw new Error('Expect "attention_bias" shape (batch_size, num_heads, sequence_length, total_sequence_length)')}return{batchSize:f,sequenceLength:c,pastSequenceLength:y,kvSequenceLength:g,totalSequenceLength:w,maxSequenceLength:b,inputHiddenSize:0,hiddenSize:h,vHiddenSize:I,headSize:x,vHeadSize:Math.floor(I/t.numHeads),numHeads:t.numHeads,isUnidirectional:!1,pastPresentShareBuffer:!1,maskFilterValue:t.maskFilterValue,maskType:S,scale:t.scale,broadcastResPosBias:E,passPastInKv:T,qkvFormat:$}},Hf=e=>fe({...e}),Zi=fe({perm:[0,2,1,3]}),Gu=(e,t,r,n,a,i,s)=>{let u=[n,a,i],d=z.size(u),l=[{type:12,data:d},{type:12,data:s},{type:12,data:i}],f=c=>{let h=H("qkv_with_bias",t.dataType,u),g=R("qkv",t.dataType,u),y=R("bias",r.dataType,u),b=[{name:"output_size",type:"u32"},{name:"bias_offset",type:"u32"},{name:"hidden_size",type:"u32"}];return`
  ${c.registerUniforms(b).declareVariables(g,y,h)}
  ${c.mainStart()}
    ${c.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let bias_offset_idx = (global_idx % uniforms.hidden_size) + uniforms.bias_offset;

    qkv_with_bias[global_idx] = qkv[global_idx] + bias[bias_offset_idx];
  }`};return e.compute({name:"MultiHeadAttentionAddBias",shaderCache:{inputDependencies:["type","type"]},getRunData:()=>({outputs:[{dims:u,dataType:t.dataType,gpuDataType:0}],dispatchGroup:{x:Math.ceil(d/64)},programUniforms:l}),getShaderSource:f},{inputs:[t,r],outputs:[-1]})[0]},ur=(e,t,r,n,a,i,s,u)=>{let d=i;if(s&&z.size(s.dims)>0){if(n===1)throw new Error("AddBiasReshape is not implemented. Please export your model with packed QKV or KV");return d=Gu(e,i,s,t,n,r*a,u),d=d.reshape([t,n,r,a]),r===1||n===1?d:e.compute(De(d,Zi.perm),{inputs:[d],outputs:[-1]})[0]}else return i.dims.length===3&&(d=i.reshape([t,n,r,a])),r===1||n===1?d:e.compute(De(d,Zi.perm),{inputs:[d],outputs:[-1]})[0]},Ff=(e,t)=>{let r=ju(e.inputs,t),n=e.inputs[0],a=Ce(e.inputs,1),i=Ce(e.inputs,2),s=Ce(e.inputs,3),u=Ce(e.inputs,4),d=Ce(e.inputs,5),l=Ce(e.inputs,6),f=Ce(e.inputs,7);if(n.dims.length===5)throw new Error("Packed QKV is not implemented");if((a==null?void 0:a.dims.length)===5)throw new Error("Packed KV is not implemented");let c=a&&i&&a.dims.length===4&&i.dims.length===4,h=ur(e,r.batchSize,r.numHeads,r.sequenceLength,r.headSize,n,s,0);if(c)return fr(e,h,a,i,u,void 0,l,f,d,r);if(!a||!i)throw new Error("key and value must be provided");let g=ur(e,r.batchSize,r.numHeads,r.kvSequenceLength,r.headSize,a,s,r.hiddenSize),y=ur(e,r.batchSize,r.numHeads,r.kvSequenceLength,r.vHeadSize,i,s,2*r.hiddenSize);fr(e,h,g,y,u,void 0,l,f,d,r)}}),Hu,Fu,Ku,Zu,On,Zf,Qf,Xf=U(()=>{J(),re(),$e(),ie(),Hu=e=>{if(!e||e.length<1)throw new Error("too few inputs")},Fu=(e,t)=>{let r=[],n=t.numOutputs;return e[1].dims[0]>0&&(e[1].getBigInt64Array().forEach(a=>r.push(Number(a))),n=r.length),fe({numOutputs:n,axis:t.axis,splitSizes:r})},Ku=e=>`
fn calculateOutputIndex(index: u32) -> u32 {
    for (var i: u32 = 0u; i < ${e}u; i += 1u ) {
    if (index < ${F("uniforms.size_in_split_axis","i",e)}) {
        return i;
    }
    }
    return ${e}u;
}`,Zu=e=>{let t=e.length,r=[];for(let n=0;n<t;++n){let a=e[n].setByIndices("indices","input[global_idx]");t===1?r.push(a):n===0?r.push(`if (output_number == ${n}u) { ${a} }`):n===t-1?r.push(`else { ${a} }`):r.push(`else if (output_number == ${n}) { ${a} }`)}return`
      fn writeBufferData(output_number: u32, indices: ${e[0].type.indices}, global_idx: u32) {
        ${r.join(`
`)}
      }`},On=(e,t)=>{let r=e[0].dims,n=z.size(r),a=e[0].dataType,i=z.normalizeAxis(t.axis,r.length),s=new Array(t.numOutputs),u=R("input",a,r.length),d=new Array(t.numOutputs),l=[],f=[],c=0,h=[{type:12,data:n}];for(let y=0;y<t.numOutputs;y++){c+=t.splitSizes[y],d[y]=c;let b=r.slice();b[i]=t.splitSizes[y],f.push(b),s[y]=H(`output${y}`,a,b.length),l.push({dims:f[y],dataType:e[0].dataType})}h.push({type:12,data:d},...Z(r,...f));let g=y=>`
  ${y.registerUniform("input_size","u32").registerUniform("size_in_split_axis","u32",d.length).declareVariables(u,...s)}
  ${Ku(d.length)}
  ${Zu(s)}

  ${y.mainStart()}
    ${y.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.input_size")}

    var indices = ${u.offsetToIndices("global_idx")};
    var index = ${u.indicesGet("indices",i)};
    let output_number = calculateOutputIndex(index);
    if (output_number != 0) {
      index -= ${F("uniforms.size_in_split_axis","output_number - 1u",d.length)};
      ${u.indicesSet("indices",i,"index")};
    }
    writeBufferData(output_number, indices, global_idx);
  }`;return{name:"Split",shaderCache:{hint:t.cacheKey,inputDependencies:["rank"]},getShaderSource:g,getRunData:()=>({outputs:l,dispatchGroup:{x:Math.ceil(n/64)},programUniforms:h})}},Zf=(e,t)=>{Hu(e.inputs);let r=e.inputs.length===1?t:Fu(e.inputs,t);e.compute(On(e.inputs,r),{inputs:[0]})},Qf=e=>{let t=e.axis,r=e.splitSizes,n=e.numOutputs<0?r.length:e.numOutputs;if(n!==r.length)throw new Error("numOutputs and splitSizes lengh must be equal");return fe({axis:t,numOutputs:n,splitSizes:r})}}),Qu,Fr,Yf,Jf=U(()=>{J(),re(),$e(),ie(),Qu=(e,t)=>{let[r,n,a,i]=e,{numHeads:s,rotaryEmbeddingDim:u}=t;if(r.dims.length!==3&&r.dims.length!==4)throw new Error(`Input 'x' is expected to have 3 or 4 dimensions, got ${r.dims.length}`);if(!z.areEqual(n.dims,[])&&!z.areEqual(n.dims,[1])&&n.dims.length!==2)throw new Error(`Input 'position_ids' is expected to have 0, 1, or 2 dimensions, got ${n.dims.length}`);if(a.dims.length!==2)throw new Error(`Input 'cos_cache' is expected to have 2 dimensions, got ${a.dims.length}`);if(i.dims.length!==2)throw new Error(`Input 'sin_cache' is expected to have 2 dimensions, got ${i.dims.length}`);if(!z.areEqual(a.dims,i.dims))throw new Error("Inputs 'cos_cache' and 'sin_cache' are expected to have the same shape");if(u>0&&s===0)throw new Error("num_heads must be provided if rotary_embedding_dim is specified");let d=r.dims[0],l=r.dims[r.dims.length-2],f=a.dims[0],c=z.sizeFromDimension(r.dims,1)/l,h=u===0?a.dims[1]*2:c/s;if(u>h)throw new Error("rotary_embedding_dim must be less than or equal to head_size");if(n.dims.length===2){if(d!==n.dims[0])throw new Error(`Input 'position_ids' dimension 0 should be of size batch_size, got ${n.dims[0]}`);if(l!==n.dims[1])throw new Error(`Input 'position_ids' dimension 1 should be of size sequence_length, got ${n.dims[1]}`)}if(h/2!==a.dims[1]&&u/2!==a.dims[1])throw new Error(`Input 'cos_cache' dimension 1 should be same as head_size / 2 or rotary_embedding_dim / 2, got ${a.dims[1]}`);if(l>f)throw new Error("Updating cos_cache and sin_cache in RotaryEmbedding is not currently supported")},Fr=(e,t)=>{let{interleaved:r,numHeads:n,rotaryEmbeddingDim:a,scale:i}=t,s=e[0].dims[0],u=z.sizeFromDimension(e[0].dims,1),d=e[0].dims[e[0].dims.length-2],l=u/d,f=e[2].dims[1],c=a===0?f*2:l/n,h=new Array(s,d,l/c,c-f),g=z.computeStrides(h),y=[{type:1,data:i},{type:12,data:h},{type:12,data:g},...e[0].dims.length===3?new Array({type:12,data:[u,l,c,1]}):[],...e[0].dims.length===4?new Array({type:12,data:[u,c,d*c,1]}):[],...Z(e[0].dims,e[1].dims,e[2].dims,e[3].dims,e[0].dims)],b=x=>{let $=R("input",e[0].dataType,e[0].dims.length),w=R("position_ids",e[1].dataType,e[1].dims.length),S=R("cos_cache",e[2].dataType,e[2].dims.length),T=R("sin_cache",e[3].dataType,e[3].dims.length),I=H("output",e[0].dataType,e[0].dims.length);return x.registerUniforms([{name:"scale",type:"f32"},{name:"global_shape",type:"u32",length:h.length},{name:"global_strides",type:"u32",length:g.length},{name:"input_output_strides",type:"u32",length:g.length}]),`
        ${x.declareVariables($,w,S,T,I)}

        ${x.mainStart(qt)}
          let half_rotary_emb_dim = uniforms.${S.name}_shape[1];
          let bsnh = global_idx / uniforms.global_strides % uniforms.global_shape;
          let size = uniforms.global_shape[0] * uniforms.global_strides[0];
          ${x.guardAgainstOutOfBoundsWorkgroupSizes("size")}

          if (bsnh[3] < half_rotary_emb_dim) {
            let position_ids_idx =
                ${w.broadcastedIndicesToOffset("bsnh.xy",H("",w.type.tensor,2))};
            let position_id =
                u32(${w.getByOffset("position_ids_idx")}) + select(0, bsnh[1], position_ids_idx == 0);
            let i = dot(bsnh, uniforms.input_output_strides) + select(0, bsnh[3], ${r});
            let j = i + select(half_rotary_emb_dim, 1, ${r});
            let re = ${$.getByOffset("i")} * ${S.get("position_id","bsnh[3]")} -
                ${$.getByOffset("j")} * ${T.get("position_id","bsnh[3]")};
            ${I.setByOffset("i","re")}
            let im = ${$.getByOffset("i")} * ${T.get("position_id","bsnh[3]")} +
                ${$.getByOffset("j")} * ${S.get("position_id","bsnh[3]")};
            ${I.setByOffset("j","im")}
          } else {
            let k = dot(bsnh, uniforms.input_output_strides) + half_rotary_emb_dim;
            ${I.setByOffset("k",$.getByOffset("k"))}
          }
        }`};return{name:"RotaryEmbedding",shaderCache:{hint:fe({interleaved:r}).cacheKey,inputDependencies:["rank","rank","rank","rank"]},getShaderSource:b,getRunData:()=>({outputs:[{dims:e[0].dims,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(z.size(h)/qt)},programUniforms:y})}},Yf=(e,t)=>{Qu(e.inputs,t),e.compute(Fr(e.inputs,t))}}),Xu,Yu,Qi,Ju,ec,Eg=U(()=>{$e(),J(),Xn(),Kf(),Xf(),yt(),Jf(),ie(),Xu=(e,t)=>{if(t.doRotary&&e.length<=7)throw new Error("cos_cache and sin_cache inputs are required if do_rotary is specified");let r=e[0],n=e[1],a=e[2],i=e[3],s=e[4];if(t.doRotary!==0&&e.length<=7)throw new Error("cos_cast and sin_cache are expected if do_rotary attribute is non-zero");if(t.localWindowSize!==-1)throw new Error("Local attention is not supported");if(t.softcap!==0)throw new Error("Softcap is not supported");if(t.rotaryInterleaved!==0)throw new Error("Rotary interleaved is not supported");if(t.smoothSoftmax)throw new Error("Smooth softmax is not supported");if(r.dims.length!==3&&r.dims.length!==5)throw new Error("Input query is expected to have 3 or 5 dimensions");let u=!1,d=r.dims[0],l=r.dims[1],f=r.dims.length===3?u?r.dims[2]/3:r.dims[2]:t.numHeads*r.dims[4],c=l,h=0,g=!n||n.dims.length===0,y=Math.floor(g?f/(t.numHeads+2*t.kvNumHeads):f/t.numHeads);g&&(f=y*t.numHeads);let b=i&&i.dims.length!==0,x=s&&s.dims.length!==0;if(b&&i.dims.length===4&&i.dims[0]===d&&i.dims[1]!==t.kvNumHeads&&i.dims[2]===t.kvNumHeads&&i.dims[3]===y)throw new Error("BSNH pastKey/pastValue is not supported");if(b&&x){if(i.dims.length!==4)throw new Error('Input "past_key" is expected to have 4 dimensions');if(s.dims.length!==4)throw new Error('Input "past_value" is expected to have 4 dimensions');h=i.dims[2]}else if(b||x)throw new Error('Input "past_key" and "past_value" shall be both present or both absent');let $=1;if(n&&n.dims.length>0){if(r.dims.length!==3)throw new Error('Input "query" is expected to have 3 dimensions when key is given');if(n.dims.length<3||n.dims.length>5)throw new Error('Input "key" is expected to have 3, 4, or 5 dimensions');if(r.dims[0]!==n.dims[0])throw new Error('Input "query" and "key" shall have same dim 0 (batch size)');if(n.dims.length===3){if(r.dims[2]%n.dims[2]!==0)throw new Error('Dimension 2 of "query" should be a multiple of "key"');c=n.dims[1]}else if(n.dims.length===5){if(n.dims[2]!==t.numHeads||n.dims[3]!==2||n.dims[4]!==y)throw new Error('Expect "key" shape (batch_size, kv_sequence_length, num_heads, 2, head_size) for packed kv');if(a)throw new Error('Expect "value" be none when "key" has packed kv format.');c=n.dims[1]}else{if(n.dims[1]!==t.numHeads||n.dims[3]!==y)throw new Error('Expect "key" shape (batch_size, num_heads, kv_sequence_length, head_size) for past_key');c=n.dims[2]}}else{if(r.dims.length!==3&&r.dims.length!==5)throw new Error('Input "query" is expected to have 3 or 5 dimensions when key is empty');if(r.dims.length===5&&(r.dims[2]!==t.numHeads||r.dims[3]!==3))throw new Error('Expect "query" shape (batch_size, kv_sequence_length, num_heads, 3, head_size) for packed kv');$=3}let w=0,S=!1,T=t.kvNumHeads?y*t.kvNumHeads:f;if(a&&a.dims.length>0){if(a.dims.length!==3&&a.dims.length!==4)throw new Error('Input "value" is expected to have 3 or 4 dimensions');if(r.dims[0]!==a.dims[0])throw new Error('Input "query" and "value" shall have same dim 0 (batch_size)');if(a.dims.length===3){if(c!==a.dims[1])throw new Error('Input "key" and "value" shall have the same dim 1 (kv_sequence_length)');T=a.dims[2]}else{if(c!==a.dims[2])throw new Error('Input "past_key" and "past_value" shall have the same dim 2 (kv_sequence_length)');T=a.dims[1]*a.dims[3],S=!0}}let I=e.length>4?e[5]:void 0;if(I&&I.dims.length!==1&&I.dims[0]!==d)throw new Error('Input "seqlens" is expected to have 1 dimension and the same dim 0 as batch_size');return{batchSize:d,sequenceLength:l,pastSequenceLength:h,kvSequenceLength:c,totalSequenceLength:-1,maxSequenceLength:-1,inputHiddenSize:0,hiddenSize:f,vHiddenSize:T,headSize:y,vHeadSize:Math.floor(T/t.kvNumHeads),numHeads:t.numHeads,kvNumHeads:t.kvNumHeads,nReps:t.numHeads/t.kvNumHeads,pastPresentShareBuffer:!1,maskType:w,scale:t.scale,broadcastResPosBias:!1,passPastInKv:S,qkvFormat:$}},Yu=fe({perm:[0,2,1,3]}),Qi=(e,t,r)=>{let n=t,a=r.kvNumHeads;return t.dims.length===3&&r.kvSequenceLength!==0&&(n=t.reshape([r.batchSize,r.kvSequenceLength,a,r.headSize]),n=e.compute(De(n,Yu.perm),{inputs:[n],outputs:[-1]})[0]),n},Ju=(e,t,r,n)=>{let a=7,i=["type","type"],s=[e*t],u=e*t,d=[{type:12,data:u},{type:12,data:t},{type:12,data:e}],l=f=>{let c=R("seq_lens",r.dataType,r.dims),h=R("total_seq_lens",n.dataType,n.dims),g=H("pos_ids",a,s),y=[{name:"output_size",type:"u32"},{name:"sequence_length",type:"u32"},{name:"batch_size",type:"u32"}];return`
  ${f.registerUniforms(y).declareVariables(c,h,g)}
  ${f.mainStart()}
    ${f.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
    let total_sequence_length = u32(${h.getByOffset("0")});
    let is_subsequent_prompt = uniforms.sequence_length > 1 && uniforms.sequence_length != total_sequence_length;
    let is_first_prompt = !is_subsequent_prompt && uniforms.sequence_length == total_sequence_length;
    let batch_idx = global_idx / uniforms.sequence_length;
    let sequence_idx = i32(global_idx % uniforms.sequence_length);
    var pos_id: i32 = 0;
    let seqlen = ${c.getByOffset("batch_idx")};
    let total_seqlen = seqlen + 1;
    if (is_first_prompt) {
      if (sequence_idx < total_seqlen) {
        pos_id = sequence_idx;
      } else {
        pos_id = 1;
      }
      ${g.setByOffset("global_idx","pos_id")}
    } else if (is_subsequent_prompt) {
      let past_seqlen = total_seqlen - i32(uniforms.sequence_length);
      if (past_seqlen + sequence_idx < total_seqlen) {
        pos_id = past_seqlen + sequence_idx;
      } else {
        pos_id = 1;
      }
      ${g.setByOffset("global_idx","pos_id")}
    } else if (global_idx < uniforms.batch_size) {
      ${g.setByOffset("global_idx","seqlen")}
    };
  }
  `};return{name:"GeneratePositionIds",shaderCache:{hint:`${e};${t}`,inputDependencies:i},getRunData:()=>({outputs:[{dims:s,dataType:a}],dispatchGroup:{x:Math.ceil(u/64)},programUniforms:d}),getShaderSource:l}},ec=(e,t)=>{var T;let r=Xu(e.inputs,t);if(e.inputs[0].dims.length===5)throw new Error("Packed QKV is not implemented");if(((T=e.inputs[1])==null?void 0:T.dims.length)===5)throw new Error("Packed KV is not implemented");let n=e.inputs[0],a=e.inputs[1]&&e.inputs[1].dims.length>0?e.inputs[1]:void 0,i=e.inputs[2]&&e.inputs[2].dims.length>0?e.inputs[2]:void 0,s=e.inputs[3]&&e.inputs[3].dims.length!==0?e.inputs[3]:void 0,u=e.inputs[4]&&e.inputs[4].dims.length!==0?e.inputs[4]:void 0,d=e.inputs.length>4?e.inputs[5]:void 0,l=e.inputs.length>5?e.inputs[6]:void 0,f=r.kvNumHeads?r.kvNumHeads:r.numHeads,c=fe({axis:2,numOutputs:3,splitSizes:[r.numHeads*r.headSize,f*r.headSize,f*r.headSize]}),[h,g,y]=!a&&!i?e.compute(On([n],c),{inputs:[n],outputs:[-1,-1,-1]}):[n,a,i],b,x;if(t.doRotary){let I=e.compute(Ju(r.batchSize,r.sequenceLength,d,l),{inputs:[d,l],outputs:[-1]})[0],E=e.inputs[7],C=e.inputs[8],A=fe({interleaved:t.rotaryInterleaved!==0,numHeads:r.numHeads,rotaryEmbeddingDim:0,scale:t.scale}),O=[h,I,E,C],W=[-1];b=e.compute(Fr(O,A),{inputs:O,outputs:W})[0],O.splice(0,1,g);let X=fe({interleaved:t.rotaryInterleaved!==0,numHeads:r.kvNumHeads,rotaryEmbeddingDim:0,scale:t.scale});x=e.compute(Fr(O,X),{inputs:O,outputs:W})[0]}let $=ur(e,r.batchSize,r.numHeads,r.sequenceLength,r.headSize,t.doRotary?b:h,void 0,0),w=Qi(e,t.doRotary?x:g,r),S=Qi(e,y,r);fr(e,$,w,S,void 0,void 0,s,u,void 0,r,d,l)}}),Xi,el,tl,tc,Cg=U(()=>{J(),re(),yt(),ie(),Xi=(e,t,r,n,a,i,s,u)=>{let d=we(i),l=d===1?"f32":`vec${d}f`,f=d===1?"vec2f":`mat2x${d}f`,c=a*s,h=64;c===1&&(h=256);let g=[a,s,i/d],y=[a,s,2],b=["rank","type","type"],x=[];x.push(...Z(g,y));let $=w=>{let S=R("x",t.dataType,3,d),T=R("scale",r.dataType,r.dims),I=R("bias",n.dataType,n.dims),E=H("output",1,3,2),C=[S,T,I,E];return`
  var<workgroup> workgroup_shared : array<${f}, ${h}>;
  const workgroup_size = ${h}u;
  ${w.declareVariables(...C)}
  ${w.mainStart(h)}
    let batch = workgroup_index / uniforms.x_shape[1];
    let channel = workgroup_index % uniforms.x_shape[1];
    let hight = uniforms.x_shape[2];
    // initialize workgroup memory
    var sum = ${l}(0);
    var squared_sum = ${l}(0);
    for (var h = local_idx; h < hight; h += workgroup_size) {
      let value = ${l}(${S.get("batch","channel","h")});
      sum += value;
      squared_sum += value * value;
    }
    workgroup_shared[local_idx] = ${f}(sum, squared_sum);
    workgroupBarrier();

    for (var currSize = workgroup_size >> 1;  currSize > 0; currSize = currSize >> 1) {
      if (local_idx < currSize) {
        workgroup_shared[local_idx] = workgroup_shared[local_idx] + workgroup_shared[local_idx + currSize];
      }
      workgroupBarrier();
    }
    if (local_idx == 0) {
      let sum_final = ${gt("workgroup_shared[0][0]",d)} / f32(hight * ${d});
      let squared_sum_final = ${gt("workgroup_shared[0][1]",d)} / f32(hight * ${d});

      let inv_std_dev = inverseSqrt(squared_sum_final - sum_final * sum_final + f32(${u}));
      let channel_scale = inv_std_dev * f32(scale[channel]);
      let channel_shift = f32(bias[channel]) - sum_final * channel_scale;
      output[workgroup_index] = vec2f(channel_scale, channel_shift);
    }
  }`};return e.compute({name:"InstanceNormComputeChannelScaleShift",shaderCache:{hint:`${d};${u};${h}`,inputDependencies:b},getRunData:()=>({outputs:[{dims:y,dataType:1}],dispatchGroup:{x:c},programUniforms:x}),getShaderSource:$},{inputs:[t,r,n],outputs:[-1]})[0]},el=(e,t,r)=>{let n=t[0].dims,a=n,i=2,s=n[0],u=n[1],d=z.sizeFromDimension(n,i),l=we(d),f=z.size(a)/l,c=Xi(e,t[0],t[1],t[2],s,d,u,r.epsilon),h=[s,u,d/l],g=[s,u],y=["type","none"],b=x=>{let $=R("x",t[0].dataType,h.length,l),w=R("scale_shift",1,g.length,2),S=H("output",t[0].dataType,h.length,l),T=[$,w,S];return`
  ${x.registerUniform("output_size","u32").declareVariables(...T)}
  ${x.mainStart()}
  ${x.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let outputIndices = ${S.offsetToIndices("global_idx")};
      let batch = outputIndices[0];
      let channel = outputIndices[1];
      let scale_shift = ${w.getByIndices("vec2<u32>(batch, channel)")};
      let value = ${$.getByOffset("global_idx")} * ${S.type.value}(scale_shift.x) + ${S.type.value}(scale_shift.y);
      ${S.setByOffset("global_idx","value")};
  }`};e.compute({name:"InstanceNormalization",shaderCache:{hint:`${l}`,inputDependencies:y},getRunData:()=>({outputs:[{dims:a,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(f/64)},programUniforms:[{type:12,data:f},...Z(h,g,h)]}),getShaderSource:b},{inputs:[t[0],c]})},tl=(e,t,r)=>{let n=t[0].dims,a=n,i=n[0],s=n[n.length-1],u=z.sizeFromDimension(n,1)/s,d=we(s),l=z.size(a)/d,f=[{type:12,data:u},{type:12,data:Math.floor(s/d)}],c=["type","type"],h=!1,g=[0,n.length-1];for(let $=0;$<n.length-2;$++)h=h||n[$+1]!==1,g.push($+1);h=h&&n[n.length-1]!==1;let y=h?e.compute(De(e.inputs[0],g),{inputs:[e.inputs[0]],outputs:[-1]})[0]:e.inputs[0].reshape(Array.from({length:n.length},($,w)=>n[g[w]])),b=Xi(e,y,t[1],t[2],i,u,s,r.epsilon),x=$=>{let w=Te(t[0].dataType),S=d===1?"vec2f":`mat${d}x2f`,T=C=>{let A=C===0?"x":"y",O=d===1?"f32":`vec${d}f`;switch(d){case 1:return`${w}(${O}(scale.${A}))`;case 2:return`vec2<${w}>(${O}(scale[0].${A}, scale[1].${A}))`;case 4:return`vec4<${w}>(${O}(scale[0].${A}, scale[1].${A}, scale[2].${A}, scale[3].${A}))`;default:throw new Error(`Not supported compoents ${d}`)}},I=R("input",t[0].dataType,t[0].dims,d),E=H("output",t[0].dataType,a,d);return`
  @group(0) @binding(0) var<storage, read> input : array<${I.type.storage}>;
  @group(0) @binding(1) var<storage, read> scale_input : array<${S}>;
  @group(0) @binding(2) var<storage, read_write> output : array<${E.type.storage}>;
  struct Uniforms {H: u32, C : u32};
  @group(0) @binding(3) var<uniform> uniforms: Uniforms;

  ${$.mainStart()}
    let current_image_number = global_idx / (uniforms.C * uniforms.H);
    let current_channel_number = global_idx % uniforms.C;

    let scale_offset = current_image_number * uniforms.C + current_channel_number;
    let scale = scale_input[scale_offset];
    output[global_idx] = fma(input[global_idx], ${T(0)}, ${T(1)});
  }`};e.compute({name:"InstanceNormalizationNHWC",shaderCache:{hint:`${d}`,inputDependencies:c},getRunData:()=>({outputs:[{dims:a,dataType:t[0].dataType}],dispatchGroup:{x:Math.ceil(l/64)},programUniforms:f}),getShaderSource:x},{inputs:[t[0],b]})},tc=(e,t)=>{t.format==="NHWC"?tl(e,e.inputs,t):el(e,e.inputs,t)}}),rl,il,rc,zg=U(()=>{J(),re(),ie(),rl=e=>{if(!e||e.length<2)throw new Error("layerNorm requires at least 2 inputs.")},il=(e,t,r)=>{let n=t.simplified,a=e[0].dims,i=e[1],s=!n&&e[2],u=a,d=z.normalizeAxis(t.axis,a.length),l=z.sizeToDimension(a,d),f=z.sizeFromDimension(a,d),c=z.size(i.dims),h=s?z.size(s.dims):0;if(c!==f||s&&h!==f)throw new Error(`Size of X.shape()[axis:] == ${f}.
       Size of scale and bias (if provided) must match this.
       Got scale size of ${c} and bias size of ${h}`);let g=[];for(let I=0;I<a.length;++I)I<d?g.push(a[I]):g.push(1);let y=we(f),b=["type","type"],x=[{type:12,data:l},{type:1,data:f},{type:12,data:Math.floor(f/y)},{type:1,data:t.epsilon}];s&&b.push("type");let $=r>1,w=r>2,S=I=>{let E=Te(e[0].dataType),C=[R("x",e[0].dataType,e[0].dims,y),R("scale",i.dataType,i.dims,y)];s&&C.push(R("bias",s.dataType,s.dims,y)),C.push(H("output",e[0].dataType,u,y)),$&&C.push(H("mean_data_output",1,g)),w&&C.push(H("inv_std_output",1,g));let A=[{name:"norm_count",type:"u32"},{name:"norm_size",type:"f32"},{name:"norm_size_vectorized",type:"u32"},{name:"epsilon",type:"f32"}];return`
  ${I.registerUniforms(A).declareVariables(...C)}
  ${I.mainStart()}
    ${I.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.norm_count")}
    let offset = global_idx * uniforms.norm_size_vectorized;
    var mean_vector = ${xn("f32",y)};
    var mean_square_vector = ${xn("f32",y)};

    for (var h: u32 = 0u; h < uniforms.norm_size_vectorized; h++) {
      let value = ${Wt(E,y,"x[h + offset]")};
      mean_vector += value;
      mean_square_vector += value * value;
    }
    let mean = ${gt("mean_vector",y)} / uniforms.norm_size;
    let inv_std_dev = inverseSqrt(${gt("mean_square_vector",y)} / uniforms.norm_size ${n?"":"- mean * mean"} + uniforms.epsilon);

    for (var j: u32 = 0; j < uniforms.norm_size_vectorized; j++) {
      let f32input = ${Wt(E,y,"x[j + offset]")};
      let f32scale = ${Wt(E,y,"scale[j]")};
      output[j + offset] = ${C[0].type.value}((f32input ${n?"":"- mean"}) * inv_std_dev * f32scale
        ${s?`+ ${Wt(E,y,"bias[j]")}`:""}
      );
    }

    ${$?"mean_data_output[global_idx] = mean":""};
    ${w?"inv_std_output[global_idx] = inv_std_dev":""};
  }`},T=[{dims:u,dataType:e[0].dataType}];return $&&T.push({dims:g,dataType:1}),w&&T.push({dims:g,dataType:1}),{name:"LayerNormalization",shaderCache:{hint:`${y};${r};${n}`,inputDependencies:b},getRunData:()=>({outputs:T,dispatchGroup:{x:Math.ceil(l/64)},programUniforms:x}),getShaderSource:S}},rc=(e,t)=>{rl(e.inputs),e.compute(il(e.inputs,t,e.outputCount))}}),nl,ic,Ag=U(()=>{re(),ra(),ia(),nl=e=>{if(!e||e.length!==2)throw new Error("MatMul requires 2 inputs.");if(e[0].dims[e[0].dims.length-1]!==e[1].dims[e[1].dims.length-2])throw new Error("shared dimension does not match.")},ic=e=>{nl(e.inputs);let t=Lt.calcShape(e.inputs[0].dims,e.inputs[1].dims,!0);if(!t)throw new Error("Can't use matmul on the given tensors");let r=t[t.length-1],n=e.inputs[0].dims[e.inputs[0].dims.length-1];if(r<8&&n<8)e.compute(ta(e.inputs,{activation:""},t));else{let a=t[t.length-2],i=z.size(e.inputs[0].dims.slice(0,-2)),s=z.size(e.inputs[1].dims.slice(0,-2));if(i!==1&&a===1&&s===1){let u=e.inputs[0].reshape([1,i,n]),d=e.inputs[1].reshape([1,n,r]),l=[1,i,r],f=[u,d];e.compute(Hr(f,{activation:""},t,l),{inputs:f})}else e.compute(Hr(e.inputs,{activation:""},t))}}}),al,sl,ol,nc,ac,Og=U(()=>{J(),re(),$e(),ie(),al=(e,t)=>{if(e.length<3||e.length>4)throw new Error("MatMulNBits requires 3 or 4 inputs");let r=e[0],n=r.dims.length;if(r.dims[n-1]!==t.k)throw new Error("The last dim of input shape does not match the k value");let a=Math.floor((t.k+t.blockSize-1)/t.blockSize),i=t.blockSize/8*t.bits,s=e[1];if(!z.areEqual(s.dims,[t.n,a,i]))throw new Error("The second inputs must be 3D tensor with shape N X nBlocksPerCol X blobSize");let u=e[2].dims;if(z.size(u)!==t.n*a)throw new Error("scales input size error.");if(e.length===4){let d=e[3].dims,l=t.bits>4?t.n*a:t.n*Math.floor((a+1)/2);if(z.size(d)!==l)throw new Error("zeroPoints input size error.")}},sl=(e,t)=>{let r=e[0].dims,n=r.length,a=r[n-2],i=t.k,s=t.n,u=r.slice(0,n-2),d=z.size(u),l=e[1].dims[2]/4,f=e[0].dataType,c=we(t.k),h=we(l),g=we(s),y=u.concat([a,s]),b=a>1&&s/g%2===0?2:1,x=z.size(y)/g/b,$=64,w=[],S=[d,a,i/c],T=z.convertShape(e[1].dims).slice();T.splice(-1,1,l/h),w.push(...Z(S)),w.push(...Z(T)),w.push(...Z(e[2].dims)),e.length===4&&w.push(...Z(z.convertShape(e[3].dims)));let I=[d,a,s/g];w.push(...Z(I));let E=C=>{let A=S.length,O=R("a",e[0].dataType,A,c),W=R("b",12,T.length,h),X=R("scales",e[2].dataType,e[2].dims.length),G=[O,W,X],Q=e.length===4?R("zero_points",12,e[3].dims.length):void 0;Q&&G.push(Q);let oe=I.length,te=H("output",e[0].dataType,oe,g),V=Te(e[0].dataType),L=(()=>{switch(c){case 1:return`array<${V}, 8>`;case 2:return`mat4x2<${V}>`;case 4:return`mat2x4<${V}>`;default:throw new Error(`${c}-component is not supported.`)}})(),le=()=>{let D=`
          // reuse a data
            var input_offset = ${O.indicesToOffset(`${O.type.indices}(batch, row, word_offset)`)};
            var a_data: ${L};
            for (var j: u32 = 0; j < ${8/c}; j++) {
              a_data[j] = ${O.getByOffset("input_offset")};
              input_offset++;
            }
          `;for(let P=0;P<g*b;P++)D+=`
            b_value = ${h===1?`b${P}_data`:`b${P}_data[i]`};
            b_value_lower = unpack4xU8(b_value & b_mask);
            b_value_upper = unpack4xU8((b_value >> 4) & b_mask);
            b_quantized_values = ${L}(${Array.from({length:4},(j,se)=>`${V}(b_value_lower[${se}]), ${V}(b_value_upper[${se}])`).join(", ")});
            b_dequantized_values = ${c===1?`${L}(${Array.from({length:8},(j,se)=>`(b_quantized_values[${se}] - ${Q?`zero_point${P}`:"zero_point"}) * scale${P}`).join(", ")});`:`(b_quantized_values - ${L}(${Array(8).fill(`${Q?`zero_point${P}`:"zero_point"}`).join(",")})) * scale${P};`};
            workgroup_shared[local_id.x * ${b} + ${Math.floor(P/g)}]${g>1?`[${P%g}]`:""} += ${Array.from({length:8/c},(j,se)=>`${c===1?`a_data[${se}] * b_dequantized_values[${se}]`:`dot(a_data[${se}], b_dequantized_values[${se}])`}`).join(" + ")};
          `;return D},ee=()=>{let D=`
            var col_index = col * ${g};
            ${Q?`
            let zero_point_bytes_per_col = (nBlocksPerCol + 1) / 2;
            var zero_point_byte_count: u32;
            var zero_point_word_index: u32;
            var zero_point_byte_offset: u32;
            let zero_point_nibble_offset: u32 = block & 0x1u;
            var zero_point_bits_offset: u32;
            var zero_point_word: u32;`:`
            // The default zero point is 8 for unsigned 4-bit quantization.
            let zero_point = ${V}(8);`}
            `;for(let P=0;P<g*b;P++)D+=`
            let scale${P} = ${X.getByOffset("col_index * nBlocksPerCol + block")};
            ${Q?`
            zero_point_byte_count = col_index * zero_point_bytes_per_col + (block >> 0x1u);
            zero_point_word_index = zero_point_byte_count >> 0x2u;
            zero_point_byte_offset = zero_point_byte_count & 0x3u;
            zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_nibble_offset << 2);
            zero_point_word = ${Q.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point${P} = ${V}((zero_point_word) & 0xFu);`:""}
            col_index += 1;`;return D},ne=()=>{let D=`col_index = col * ${g};`;for(let P=0;P<g*b;P++)D+=`
            let b${P}_data = ${W.getByIndices(`${W.type.indices}(col_index, block, word)`)};
            col_index += 1;`;return D+=`
            var b_value: u32;
            let b_mask: u32 = 0x0F0F0F0Fu;
            var b_value_lower: vec4<u32>;
            var b_value_upper: vec4<u32>;
            var b_quantized_values: ${L};
            var b_dequantized_values: ${L};`,D};return`
        var<workgroup> workgroup_shared: array<${te.type.value}, ${b*$}>;
        ${C.declareVariables(...G,te)}
        ${C.mainStart([$,1,1])}
          let output_indices = ${te.offsetToIndices(`(global_idx / ${$}) * ${b}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let nBlocksPerCol = uniforms.b_shape[1];

          for (var block = local_id.x; block < nBlocksPerCol; block += ${$}) {
            //process one block
            var word_offset: u32 = block * ${t.blockSize/c};
            ${ee()}
            for (var word: u32 = 0; word < ${l}; word += ${h}) {
              ${ne()}
              for (var i: u32 = 0; i < ${h}; i++) {
                ${le()}
                word_offset += ${8/c};
              }
            }
          }
          workgroupBarrier();

          if (local_id.x < ${b}) {
            var output_value: ${te.type.value} = ${te.type.value}(0);
            var workgroup_shared_offset: u32 = local_id.x;
            for (var b: u32 = 0u; b < ${$}u; b++) {
              output_value += workgroup_shared[workgroup_shared_offset];
              workgroup_shared_offset += ${b};
            }
            ${te.setByIndices(`${te.type.indices}(batch, row, col + local_id.x)`,"output_value")};
          }
        }`};return{name:"MatMulNBits",shaderCache:{hint:`${t.blockSize};${t.bits};${c};${h};${g};${b};${$}`,inputDependencies:Array(e.length).fill("rank")},getRunData:()=>({outputs:[{dims:y,dataType:f}],dispatchGroup:{x},programUniforms:w}),getShaderSource:E}},ol=(e,t)=>{let r=e[0].dims,n=r.length,a=r[n-2],i=t.k,s=t.n,u=r.slice(0,n-2),d=z.size(u),l=e[1].dims[2]/4,f=e[0].dataType,c=we(t.k),h=we(l),g=u.concat([a,s]),y=128,b=s%8===0?8:s%4===0?4:1,x=y/b,$=x*h*8,w=$/c,S=$/t.blockSize,T=z.size(g)/b,I=[],E=[d,a,i/c],C=z.convertShape(e[1].dims).slice();C.splice(-1,1,l/h),I.push(...Z(E)),I.push(...Z(C)),I.push(...Z(e[2].dims)),e.length===4&&I.push(...Z(z.convertShape(e[3].dims)));let A=[d,a,s];I.push(...Z(A));let O=W=>{let X=E.length,G=R("a",e[0].dataType,X,c),Q=R("b",12,C.length,h),oe=R("scales",e[2].dataType,e[2].dims.length),te=[G,Q,oe],V=e.length===4?R("zero_points",12,e[3].dims.length):void 0;V&&te.push(V);let L=A.length,le=H("output",e[0].dataType,L),ee=Te(e[0].dataType),ne=()=>{switch(c){case 1:return`
          let a_data0 = vec4<${ee}>(sub_a[word_offset], sub_a[word_offset + 1], sub_a[word_offset + 2], sub_a[word_offset + 3]);
          let a_data1 = vec4<${ee}>(sub_a[word_offset + 4], sub_a[word_offset + 5], sub_a[word_offset + 6], sub_a[word_offset + 7]);`;case 2:return`
          let a_data0 = vec4<${ee}>(sub_a[word_offset], sub_a[word_offset + 1]);
          let a_data1 = vec4<${ee}>(sub_a[word_offset + 2], sub_a[word_offset + 3]);`;case 4:return`
          let a_data0 = sub_a[word_offset];
          let a_data1 = sub_a[word_offset + 1];`;default:throw new Error(`${c}-component is not supported.`)}};return`
        var<workgroup> sub_a: array<${G.type.value}, ${w}>;
        var<workgroup> inter_results: array<array<${le.type.value}, ${x}>, ${b}>;
        ${W.declareVariables(...te,le)}
        ${W.mainStart([x,b,1])}
          let output_indices = ${le.offsetToIndices(`workgroup_index * ${b}`)};
          let col = output_indices[2];
          let row = output_indices[1];
          let batch = output_indices[0];
          let n_blocks_per_col = uniforms.b_shape[1];
          let num_tiles =  (n_blocks_per_col - 1) / ${S} + 1;

          // Loop over shared dimension.
          for (var tile: u32 = 0; tile < num_tiles; tile += 1) {
            let a_col_start = tile * ${w};
            // load one tile A data into shared memory.
            for (var a_offset = local_idx; a_offset < ${w}; a_offset += ${y})
            {
              let a_col = a_col_start + a_offset;
              if (a_col < uniforms.a_shape[2])
              {
                sub_a[a_offset] = ${G.getByIndices(`${G.type.indices}(batch, row, a_col)`)};
              } else {
                sub_a[a_offset] = ${G.type.value}(0);
              }
            }
            workgroupBarrier();

            // each thread process one block
            let b_row = col + local_id.y;
            let block = tile * ${S} + local_id.x;
            ${V?`
            let zero_point_bytes_per_col = (n_blocks_per_col + 1) / 2;
            let zero_point_byte_count = b_row * zero_point_bytes_per_col + (block >> 0x1u);
            let zero_point_word_index = zero_point_byte_count >> 0x2u;
            let zero_point_byte_offset = zero_point_byte_count & 0x3u;
            let zero_point_nibble_offset: u32 = block & 0x1u;
            let zero_point_bits_offset = (zero_point_byte_offset << 3) + (zero_point_nibble_offset << 2);
            let zero_point_word = ${V.getByOffset("zero_point_word_index")} >> zero_point_bits_offset;
            let zero_point = ${ee}((zero_point_word) & 0xFu);`:`
            // The default zero point is 8 for unsigned 4-bit quantization.
            let zero_point = ${ee}(8);`}
            let scale = ${oe.getByOffset("b_row * n_blocks_per_col + block")};
            let b_data = ${Q.getByIndices(`${Q.type.indices}(b_row, block, 0)`)};
            var word_offset = local_id.x * ${t.blockSize/c};
            for (var i: u32 = 0; i < ${h}; i++) {
              ${ne()}
              let b_value = ${h===1?"b_data":"b_data[i]"};
              let b_value_lower = unpack4xU8(b_value & 0x0F0F0F0Fu);
              let b_value_upper = unpack4xU8((b_value >> 4) & 0x0F0F0F0Fu);
              let b_quantized_values = mat2x4<${ee}>(${Array.from({length:4},(D,P)=>`${ee}(b_value_lower[${P}]), ${ee}(b_value_upper[${P}])`).join(", ")});
              let b_dequantized_values = (b_quantized_values - mat2x4<${ee}>(${Array(8).fill("zero_point").join(",")})) * scale;
              inter_results[local_id.y][local_id.x] += ${Array.from({length:2},(D,P)=>`${`dot(a_data${P}, b_dequantized_values[${P}])`}`).join(" + ")};
              word_offset += ${8/c};
            }
            workgroupBarrier();
          }

          if (local_idx < ${b}) {
            var output_value: ${le.type.value} = ${le.type.value}(0);
            for (var b = 0u; b < ${x}; b++) {
              output_value += inter_results[local_idx][b];
            }
            if (col + local_idx < uniforms.output_shape[2])
            {
              ${le.setByIndices(`${le.type.indices}(batch, row, col + local_idx)`,"output_value")}
            }
          }
        }`};return{name:"BlockwiseMatMulNBits32",shaderCache:{hint:`${t.blockSize};${c};${h};${x};${b}`,inputDependencies:Array(e.length).fill("rank")},getRunData:()=>({outputs:[{dims:g,dataType:f}],dispatchGroup:{x:T},programUniforms:I}),getShaderSource:O}},nc=(e,t)=>{al(e.inputs,t),t.blockSize===32&&e.adapterInfo.isVendor("intel")&&e.adapterInfo.isArchitecture("gen-12lp")?e.compute(ol(e.inputs,t)):e.compute(sl(e.inputs,t))},ac=e=>fe(e)}),ul,ll,dl,pl,fl,cl,hl,ml,sc,Bg=U(()=>{J(),re(),ie(),ul=e=>{if(!e||e.length<1)throw new Error("Too few inputs");if(e[0].dataType!==1&&e[0].dataType!==10)throw new Error("Input type must be float or float16.");if(e.length>=2){let t=e[0].dims.length*2===e[1].dims[0];if(e.length===4&&(t=e[3].dims[0]*2===e[1].dims[0]),!t)throw new Error("The pads should be a 1D tensor of shape [2 * input_rank] or [2 * num_axes].")}},ll=(e,t,r)=>{let n="";for(let a=t-1;a>=0;--a)n+=`
            k = i32(${e.indicesGet("indices",a)}) - ${F("uniforms.pads",a,r)};
            if (k < 0) {
              break;
            }
            if (k >= i32(${F("uniforms.x_shape",a,t)})) {
              break;
            }
            offset += k * i32(${F("uniforms.x_strides",a,t)});
        `;return`
          value = ${e.type.value}(uniforms.constant_value);
          for (var i = 0; i < 1; i++) {
            var offset = 0;
            var k = 0;
            ${n}
            value = x[offset];
          }
      `},dl=(e,t,r)=>{let n="";for(let a=t-1;a>=0;--a)n+=`
                k = i32(${e.indicesGet("indices",a)}) - ${F("uniforms.pads",a,r)};
                if (k < 0) {
                  k = -k;
                }
                {
                  let _2n_1 = 2 * (i32(${F("uniforms.x_shape",a,t)}) - 1);
                  k = k % _2n_1;
                  if(k >= i32(${F("uniforms.x_shape",a,t)})) {
                    k = _2n_1 - k;
                  }
                }
                offset += k * i32(${F("uniforms.x_strides",a,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${n}
              value = x[offset];
          `},pl=(e,t,r)=>{let n="";for(let a=t-1;a>=0;--a)n+=`
                k = i32(${e.indicesGet("indices",a)}) - ${F("uniforms.pads",a,r)};
                if (k < 0) {
                  k = 0;
                }
                if (k >= i32(${F("uniforms.x_shape",a,t)})) {
                  k = i32(${F("uniforms.x_shape",a,t)}) - 1;
                }
                offset += k * i32(${F("uniforms.x_strides",a,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${n}
              value = x[offset];
          `},fl=(e,t,r)=>{let n="";for(let a=t-1;a>=0;--a)n+=`
                k = i32(${e.indicesGet("indices",a)}) - ${F("uniforms.pads",a,r)};
                if (k < 0)  {
                  k += i32(${F("uniforms.x_shape",a,t)}]);
                }
                if (k >= i32(${F("uniforms.x_shape",a,t)})) {
                  k -= i32(${F("uniforms.x_shape",a,t)});
                }
                offset += k * i32(${F("uniforms.x_strides",a,t)});
            `;return`
              var offset = 0;
              var k = 0;
              ${n}
              value = x[offset];
          `},cl=(e,t,r)=>{switch(r.mode){case 0:return ll(e,t,r.pads.length);case 1:return dl(e,t,r.pads.length);case 2:return pl(e,t,r.pads.length);case 3:return fl(e,t,r.pads.length);default:throw new Error("Invalid mode")}},hl=(e,t)=>{let r=z.padShape(e[0].dims.slice(),t.pads),n=e[0].dims,a=z.size(r),i=[{type:12,data:a},{type:6,data:t.pads}],s=e.length>=3&&e[2].data;t.mode===0&&i.push({type:s?e[2].dataType:1,data:t.value}),i.push(...Z(e[0].dims,r));let u=["rank"],d=l=>{let f=H("output",e[0].dataType,r.length),c=R("x",e[0].dataType,n.length),h=c.type.value,g=cl(f,n.length,t),y=[{name:"output_size",type:"u32"},{name:"pads",type:"i32",length:t.pads.length}];return t.mode===0&&y.push({name:"constant_value",type:s?h:"f32"}),`
            ${l.registerUniforms(y).declareVariables(c,f)}
            ${l.mainStart()}
            ${l.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}

            let indices = ${f.offsetToIndices("global_idx")};

            var value = ${h}(0);
            ${g}
            output[global_idx] = value;
        }`};return{name:"Pad",shaderCache:{hint:`${t.mode}${s}`,inputDependencies:u},getRunData:()=>({outputs:[{dims:r,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(z.size(r)/64)},programUniforms:i}),getShaderSource:d}},ml=(e,t)=>{if(e.length>1){let r=e[1].getBigInt64Array(),n=e.length>=3&&e[2].data?e[2].dataType===10?e[2].getUint16Array()[0]:e[2].getFloat32Array()[0]:0,a=e[0].dims.length,i=new Int32Array(2*a).fill(0);if(e.length>=4){let u=e[3].getBigInt64Array();for(let d=0;d<u.length;d++)i[Number(u[d])]=Number(r[d]),i[Number(u[d])+a]=Number(r[d+u.length])}else r.forEach((u,d)=>i[Number(d)]=Number(u));let s=[];return i.forEach(u=>s.push(u)),{mode:t.mode,value:n,pads:s}}else return t},sc=(e,t)=>{ul(e.inputs);let r=ml(e.inputs,t);e.compute(hl(e.inputs,r),{inputs:[0]})}}),tr,Yi,Ji,en,tn,gl,yl,rn,nn,oc,uc,an,lc,dc,sn,pc,fc,cc,hc,Rg=U(()=>{Qe(),J(),re(),ie(),tr=e=>{if(_e.webgpu.validateInputContent&&(!e||e.length!==1))throw new Error("Pool ops requires 1 input.")},Yi=(e,t,r)=>{let n=t.format==="NHWC",a=e.dims.slice();n&&a.splice(1,0,a.pop());let i=Object.hasOwnProperty.call(t,"dilations"),s=t.kernelShape.slice(),u=t.strides.slice(),d=i?t.dilations.slice():[],l=t.pads.slice();jr.adjustPoolAttributes(r,a,s,u,d,l);let f=jr.computePoolOutputShape(r,a,u,d,s,l,t.autoPad),c=Object.assign({},t);i?Object.assign(c,{kernelShape:s,strides:u,pads:l,dilations:d,cacheKey:t.cacheKey}):Object.assign(c,{kernelShape:s,strides:u,pads:l,cacheKey:t.cacheKey});let h=f.slice();return h.push(h.splice(1,1)[0]),[c,n?h:f]},Ji=(e,t)=>{let r=t.format==="NHWC",n=z.size(e),a=z.size(t.kernelShape),i=[{type:12,data:n},{type:12,data:a}],s=[{name:"outputSize",type:"u32"},{name:"kernelSize",type:"u32"}];if(t.kernelShape.length<=2){let u=t.kernelShape[t.kernelShape.length-1],d=t.strides[t.strides.length-1],l=t.pads[t.pads.length/2-1],f=t.pads[t.pads.length-1],c=!!(l+f);i.push({type:12,data:u},{type:12,data:d},{type:12,data:l},{type:12,data:f}),s.push({name:"kw",type:"u32"},{name:"sw",type:"u32"},{name:"pwStart",type:"u32"},{name:"pwEnd",type:"u32"});let h=!1;if(t.kernelShape.length===2){let g=t.kernelShape[t.kernelShape.length-2],y=t.strides[t.strides.length-2],b=t.pads[t.pads.length/2-2],x=t.pads[t.pads.length-2];h=!!(b+x),i.push({type:12,data:g},{type:12,data:y},{type:12,data:b},{type:12,data:x}),s.push({name:"kh",type:"u32"},{name:"sh",type:"u32"},{name:"phStart",type:"u32"},{name:"phEnd",type:"u32"})}return[i,s,!0,c,h]}else{if(r)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let u=z.computeStrides(t.kernelShape);i.push({type:12,data:u},{type:12,data:t.pads},{type:12,data:t.strides}),s.push({name:"kernelStrides",type:"u32",length:u.length},{name:"pads",type:"u32",length:t.pads.length},{name:"strides",type:"u32",length:t.strides.length});let d=t.pads.reduce((l,f)=>l+f);return[i,s,!!d,!1,!1]}},en=(e,t,r,n,a,i,s,u,d,l,f,c)=>{let h=a.format==="NHWC",g=t.type.value,y=H("output",t.type.tensor,n);if(a.kernelShape.length<=2){let b="",x="",$="",w=r-(h?2:1);if(f?b=`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${w}] = indices[${w}] * uniforms.sw - uniforms.pwStart + i;
                  if (xIndices[${w}] < 0 || xIndices[${w}]
                      >= uniforms.x_shape[${w}]) {
                    pad++;
                    continue;
                  }
                  let x_val = x[${t.indicesToOffset("xIndices")}];
                  ${i}
                }`:b=`
                for (var i: u32 = 0u; i < uniforms.kw; i++) {
                  xIndices[${w}] = indices[${w}] * uniforms.sw - uniforms.pwStart + i;
                  let x_val = x[${t.indicesToOffset("xIndices")}];
                  ${i}
                }`,a.kernelShape.length===2){let S=r-(h?3:2);c?x=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${S}] = indices[${S}] * uniforms.sh - uniforms.phStart + j;
                  if (xIndices[${S}] < 0 || xIndices[${S}] >= uniforms.x_shape[${S}]) {
                    pad += i32(uniforms.kw);
                    continue;
                  }
              `:x=`
                for (var j: u32 = 0u; j < uniforms.kh; j++) {
                  xIndices[${S}] = indices[${S}] * uniforms.sh - uniforms.phStart + j;
                `,$=`
              }
            `}return`
            ${e.registerUniforms(d).declareVariables(t,y)}

            ${e.mainStart()}
              ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}

              let indices = ${y.offsetToIndices("global_idx")};
              var xIndices = ${y.offsetToIndices("global_idx")};

              var value = ${g}(${u});
              var pad = 0;
              ${x}
              ${b}
              ${$}
              ${s}

              output[global_idx] = value;
            }`}else{if(h)throw new Error("Pooling with kernelShape.length > 2 is not supported for NHWC format.");let b=a.kernelShape.length,x=a.pads.length,$="";return l?$=`
                if (xIndices[j] >= uniforms.x_shape[j]) {
                  pad++;
                  isPad = true;
                  break;
                }
              }
              if (!isPad) {
                let x_val = x[${t.indicesToOffset("xIndices")}];
                ${i}
              }`:$=`
              }
              let x_val = x[${t.indicesToOffset("xIndices")}];
              ${i}
            `,`
            ${e.registerUniforms(d).declareVariables(t,y)}

            ${e.mainStart()}
              ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
              let indices = ${y.offsetToIndices("global_idx")};
              var xIndices = ${y.offsetToIndices("global_idx")};

              var offsets: array<u32, ${b}>;

              var value = ${g}(${u});
              var pad = 0;
              var isPad = false;

              for (var i: u32 = 0u; i < uniforms.kernelSize; i++) {
                var offset = i;
                for (var j = 0u; j < ${b-1}u; j++) {
                  offsets[j] = offset / ${F("uniforms.kernelStrides","j",b)};
                  offset -= offsets[j] * ${F("uniforms.kernelStrides","j",b)};
                }
                offsets[${b-1}] = offset;

                isPad = false;
                for (var j = ${r-b}u; j < ${r}u; j++) {
                  xIndices[j] = indices[j] * ${F("uniforms.strides",`j - ${r-b}u`,b)}
                    + offsets[j - ${r-b}u] - ${F("uniforms.pads","j - 2u",x)};
                  ${$}
              }
              ${s}

              output[global_idx] = value;
            }`}},tn=e=>`${e.format};${e.ceilMode};${e.autoPad};${e.kernelShape.length}`,gl=e=>`${tn(e)};${e.countIncludePad}`,yl=e=>`${tn(e)};${e.storageOrder};${e.dilations}`,rn=e=>({format:e.format,autoPad:["NOTSET","VALID","SAME_UPPER","SAME_LOWER"][e.auto_pad],ceilMode:e.ceil_mode,kernelShape:e.kernel_shape,strides:e.strides,pads:e.pads}),nn=(e,t,r,n)=>{let[a,i]=Yi(t,n,r),s=R("x",t.dataType,t.dims.length),u=s.type.value,d="value += x_val;",l="";a.countIncludePad?l+=`value /= ${u}(uniforms.kernelSize);`:l+=`value /= ${u}(i32(uniforms.kernelSize) - pad);`;let[f,c,h,g,y]=Ji(i,a);f.push(...Z(t.dims,i));let b=["rank"];return{name:e,shaderCache:{hint:`${n.cacheKey};${h};${g};${y}`,inputDependencies:b},getRunData:()=>({outputs:[{dims:i,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(z.size(i)/64)},programUniforms:f}),getShaderSource:x=>en(x,s,t.dims.length,i.length,a,d,l,0,c,h,g,y)}},oc=e=>{let t=e.count_include_pad!==0,r=rn(e);if(r.ceilMode!==0)throw new Error("using ceil() in shape computation is not yet supported for AveragePool");let n={countIncludePad:t,...r,cacheKey:""};return{...n,cacheKey:gl(n)}},uc=(e,t)=>{tr(e.inputs),e.compute(nn("AveragePool",e.inputs[0],!1,t))},an={autoPad:"",ceilMode:0,countIncludePad:!1,kernelShape:[],strides:[],pads:[],storageOrder:0,dilations:[]},lc=e=>{let t=e.format;return{format:t,...an,cacheKey:t}},dc=(e,t)=>{tr(e.inputs),e.compute(nn("GlobalAveragePool",e.inputs[0],!0,t))},sn=(e,t,r,n)=>{let[a,i]=Yi(t,n,r),s=`
      value = max(x_val, value);
    `,u="",d=R("x",t.dataType,t.dims.length),l=["rank"],[f,c,h,g,y]=Ji(i,a);return f.push(...Z(t.dims,i)),{name:e,shaderCache:{hint:`${n.cacheKey};${h};${g};${y}`,inputDependencies:l},getRunData:()=>({outputs:[{dims:i,dataType:t.dataType}],dispatchGroup:{x:Math.ceil(z.size(i)/64)},programUniforms:f}),getShaderSource:b=>en(b,d,t.dims.length,i.length,a,s,u,t.dataType===10?-65504:-1e5,c,h,g,y)}},pc=(e,t)=>{tr(e.inputs),e.compute(sn("MaxPool",e.inputs[0],!1,t))},fc=e=>{let t=e.storage_order,r=e.dilations,n=rn(e);if(t!==0)throw new Error("column major storage order is not yet supported for MaxPool");if(n.ceilMode!==0)throw new Error("using ceil() in shape computation is not yet supported for MaxPool");let a={storageOrder:t,dilations:r,...n,cacheKey:""};return{...a,cacheKey:yl(a)}},cc=e=>{let t=e.format;return{format:t,...an,cacheKey:t}},hc=(e,t)=>{tr(e.inputs),e.compute(sn("GlobalMaxPool",e.inputs[0],!0,t))}}),_l,bl,mc,gc,Dg=U(()=>{J(),re(),$e(),ie(),_l=(e,t)=>{if(e.length<2||e.length>3)throw new Error("DequantizeLinear requires 2 or 3 inputs.");if(e.length===3&&e[1].dims===e[2].dims)throw new Error("x-scale and x-zero-point must have the same shape.");if(e.length===3&&e[0].dataType!==e[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(e[0].dataType===6&&e.length>2)throw new Error("In the case of dequantizing int32 there is no zero point.");if(e[1].dims.length!==0&&e[1].dims.length!==1&&e[1].dims.length!==e[0].dims.length)throw new Error("scale input must be a scalar, a 1D tensor, or have the same rank as the input tensor.");if(e.length>2){if(e[0].dataType!==e[2].dataType)throw new Error("x and x-zero-point must have the same data type.");if(e[1].dims.length!==e[2].dims.length)throw new Error("scale and zero-point inputs must have the same rank.");if(!e[1].dims.map((r,n)=>r===e[2].dims[n]).reduce((r,n)=>r&&n,!0))throw new Error("scale and zero-point inputs must have the same shape.")}if(t.blockSize>0){if(e[1].dims.length===0||e[1].dims.length===1&&e[1].dims[0]===1)throw new Error("blockSize must be set only for block quantization.");if(!e[1].dims.map((a,i)=>i===t.axis||a===e[0].dims[i]).reduce((a,i)=>a&&i,!0))throw new Error("For block qunatization, scale input shape to match the input shape except for the axis");if(e[1].dims.length!==e[0].dims.length)throw new Error("For block qunatization the scale input rank must be the same as the x rank.");let r=e[0].dims[t.axis],n=e[1].dims[t.axis];if(t.blockSize<Math.ceil(r/n)||t.blockSize>Math.ceil(r/(n-1)-1))throw new Error("blockSize must be with in the range [ceil(dI / Si), ceil(dI / (Si - 1) - 1)].")}},bl=(e,t)=>{let r=z.normalizeAxis(t.axis,e[0].dims.length),n=e[0].dataType,a=n===3,i=e[0].dims,s=e[1].dataType,u=z.size(i),d=n===3||n===2,l=d?[Math.ceil(z.size(e[0].dims)/4)]:e[0].dims,f=e[1].dims,c=e.length>2?e[2]:void 0,h=c?d?[Math.ceil(z.size(c.dims)/4)]:c.dims:void 0,g=f.length===0||f.length===1&&f[0]===1,y=g===!1&&f.length===1,b=we(u),x=g&&(!d||b===4),$=x?b:1,w=x&&!d?b:1,S=R("input",d?12:n,l.length,w),T=R("scale",s,f.length),I=c?R("zero_point",d?12:n,h.length):void 0,E=H("output",s,i.length,$),C=[S,T];I&&C.push(I);let A=[l,f];c&&A.push(h);let O=[{type:12,data:u/$},{type:12,data:r},{type:12,data:t.blockSize},...Z(...A,i)],W=X=>{let G=[{name:"output_size",type:"u32"},{name:"axis",type:"u32"},{name:"block_size",type:"u32"}];return`
      ${X.registerUniforms(G).declareVariables(...C,E)}
      ${X.mainStart()}
          ${X.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
          let output_indices = ${E.offsetToIndices("global_idx")};

          // Set input x
          ${d?`
            let input = ${S.getByOffset("global_idx / 4")};
            let x_vec = ${a?"unpack4xI8(input)":"unpack4xU8(input)"};
            let x_value = ${$===1?"x_vec[global_idx % 4]":"x_vec"};`:`let x_value = ${S.getByOffset("global_idx")};`};

          // Set scale input
          ${g?`let scale_value= ${T.getByOffset("0")}`:y?`
            let scale_index = ${E.indicesGet("output_indices","uniforms.axis")};
            let scale_value= ${T.getByOffset("scale_index")};`:`
            var scale_indices: ${T.type.indices} = output_indices;
            let index = ${T.indicesGet("scale_indices","uniforms.axis")} / uniforms.block_size;
            ${T.indicesSet("scale_indices","uniforms.axis","index")};
            let scale_value= ${T.getByIndices("scale_indices")};`};

          // Set zero-point input
          ${I?g?d?`
                let zero_point_input = ${I.getByOffset("0")};
                let zero_point_vec =  ${a?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value= zero_point_vec[0]`:`let zero_point_value = ${I.getByOffset("0")}`:y?d?`
                let zero_point_index = ${E.indicesGet("output_indices","uniforms.axis")};
                let zero_point_input = ${I.getByOffset("zero_point_index / 4")};
                let zero_point_vec =  ${a?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_index % 4]`:`
                let zero_point_index = ${E.indicesGet("output_indices","uniforms.axis")};
                let zero_point_value = ${I.getByOffset("zero_point_index")};`:d?`
                let zero_point_offset = ${T.indicesToOffset("scale_indices")};
                let zero_point_input = ${I.getByOffset("zero_point_offset / 4")};
                let zero_point_vec = ${a?"unpack4xI8(zero_point_input)":"unpack4xU8(zero_point_input)"};
                let zero_point_value = zero_point_vec[zero_point_offset % 4];`:`let zero_point_value = ${I.getByIndices("scale_indices")};`:`let zero_point_value = ${d?a?"i32":"u32":S.type.value}(0);`};
      // Compute and write output
      ${E.setByOffset("global_idx",`${E.type.value}(x_value - zero_point_value) * scale_value`)};
      }`};return{name:"DequantizeLinear",shaderCache:{hint:t.cacheKey,inputDependencies:I?["rank","rank","rank"]:["rank","rank"]},getShaderSource:W,getRunData:()=>({outputs:[{dims:i,dataType:s}],dispatchGroup:{x:Math.ceil(u/$/64),y:1,z:1},programUniforms:O})}},mc=(e,t)=>{_l(e.inputs,t),e.compute(bl(e.inputs,t))},gc=e=>fe({axis:e.axis,blockSize:e.blockSize})}),wl,$l,yc,Ng=U(()=>{Qe(),J(),ie(),wl=(e,t,r)=>{let n=e===t,a=e<t&&r<0,i=e>t&&r>0;if(n||a||i)throw new Error("Range these inputs' contents are invalid.")},$l=(e,t,r,n)=>{let a=Math.abs(Math.ceil((t-e)/r)),i=[a],s=a,u=[{type:12,data:s},{type:n,data:e},{type:n,data:r},...Z(i)],d=l=>{let f=H("output",n,i.length),c=f.type.value,h=[{name:"outputSize",type:"u32"},{name:"start",type:c},{name:"delta",type:c}];return`
        ${l.registerUniforms(h).declareVariables(f)}
        ${l.mainStart()}
        ${l.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
        output[global_idx] = uniforms.start + ${c}(global_idx) * uniforms.delta;
      }`};return{name:"Range",shaderCache:{hint:`${n}`},getShaderSource:d,getRunData:()=>({outputs:[{dims:i,dataType:n}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:u})}},yc=e=>{let t=0,r=0,n=0;e.inputs[0].dataType===6?(t=e.inputs[0].getInt32Array()[0],r=e.inputs[1].getInt32Array()[0],n=e.inputs[2].getInt32Array()[0]):e.inputs[0].dataType===1&&(t=e.inputs[0].getFloat32Array()[0],r=e.inputs[1].getFloat32Array()[0],n=e.inputs[2].getFloat32Array()[0]),_e.webgpu.validateInputContent&&wl(t,r,n),e.compute($l(t,r,n,e.inputs[0].dataType),{inputs:[]})}}),vl,on,un,xl,_c,bc,Mg=U(()=>{J(),re(),$e(),ie(),vl=(e,t,r,n)=>{if(e!=="none"&&n!=="i32"&&n!=="u32"&&n!=="f32")throw new Error(`Input ${n} is not supported with reduction ${e}.`);let a=`{
                var oldValue = 0;
                loop {
                  let newValueF32 =`,i=`;
                  let newValue = bitcast<i32>(newValueF32);
                  let res = atomicCompareExchangeWeak(&${t}, oldValue, newValue);
                  if res.exchanged {
                    break;
                  }
                  oldValue = res.old_value;
                }
              }`;switch(e){case"none":return`${t}=${r};`;case"add":return n==="i32"||n==="u32"?`atomicAdd(&${t}, bitcast<${n}>(${r}));`:`
              ${a}bitcast<${n}>(oldValue) + (${r})${i}`;case"max":return n==="i32"||n==="u32"?`atomicMax(&${t}, bitcast<${n}>(${r}));`:`
                ${a}max(bitcast<f32>(oldValue), (${r}))${i}`;case"min":return n==="i32"||n==="u32"?`atomicMin(&${t}, bitcast<${n}>(${r}));`:`${a}min(bitcast<${n}>(oldValue), (${r}))${i}`;case"mul":return`${a}(bitcast<${n}>(oldValue) * (${r}))${i}`;default:throw new Error(`Reduction ${e} is not supported.`)}},on=(e,t)=>`${e===1?`
    let element_count_dim = uniforms.output_strides;
    let dim_value = uniforms.output_shape;`:`
    let element_count_dim = uniforms.output_strides[${t?"i - indices_start":"i"}];
    let dim_value = uniforms.output_shape[${t?"i - indices_start":"i"} + uniforms.last_index_dimension];`}
    
    if (index >= 0) {
      if (index >= i32(dim_value)) {
        index = i32(dim_value - 1);
      }
    } else {
      if (index < -i32(dim_value)) {
        index = 0;
      } else {
        index += i32(dim_value);
      }
    }
    data_offset += u32((u32(index) * element_count_dim));`,un=(e,t,r)=>`for (var i = 0u; i < uniforms.num_updates_elements; i++) {
        let value = updates[uniforms.num_updates_elements * ${r?"global_idx":"idx"} + i];
        ${vl(e.reduction,"output[data_offset + i]","value",t)}
      }`,xl=(e,t)=>{let r=e[0].dims,n=e[1].dims,a=r,i=1,s=Math.ceil(z.size(n)/i),u=n[n.length-1],d=z.sizeFromDimension(r,u),l=z.sizeFromDimension(n,0)/u,f=[{type:12,data:s},{type:12,data:u},{type:12,data:d},...Z(e[1].dims,e[2].dims,a)],c=h=>{let g=R("indices",e[1].dataType,e[1].dims.length),y=R("updates",e[2].dataType,e[2].dims.length,i),b=t.reduction!=="none"&&t.reduction!==""?Hd("output",e[0].dataType,a.length):H("output",e[0].dataType,a.length,i);return`
      ${h.registerUniform("output_size","u32").registerUniform("last_index_dimension","u32").registerUniform("num_updates_elements","u32").declareVariables(g,y,b)}
      ${h.mainStart()}
        ${h.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
  var hasDuplicates = false;
  if (${t.reduction==="none"}) {
    for (var i = 0; i < ${l}; i = i + 1) {
      for (var j = i + 1; j < ${l}; j = j + 1) {
        var index_i = i32(indices[i].x);
        var index_j = i32(indices[j].x);
        if (index_i == index_j) {
          hasDuplicates = true;
          break;
        }
      }
      if (hasDuplicates) {
        break;
      }
    }
  }

  if (${t.reduction==="none"} && hasDuplicates) {
    if (global_idx != 0u) {
      return;
    }
    // Process each index-update pair individually when duplicates exist
    for (var idx = 0u; idx < ${l}u; idx++) {
      var data_offset = 0u;
      for (var i = 0u; i < uniforms.last_index_dimension; i++) {
        var index = i32(indices[idx * uniforms.last_index_dimension + i].x);
        ${on(r.length,!1)}
      }
      ${un(t,b.type.value,!1)}
    }
    return;
  }

  var data_offset = 0u;
  var indices_start = uniforms.last_index_dimension * global_idx;
  var indices_end = indices_start + uniforms.last_index_dimension;
  for (var i = indices_start; i < indices_end; i++) {
    var index = i32(indices[i].x);
    ${on(r.length,!0)}
  }
  ${un(t,b.type.value,!0)}
  }`};return{name:"ScatterND",shaderCache:{hint:`${t.cacheKey}_${t.reduction}`,inputDependencies:["rank","rank"]},getRunData:()=>({outputs:[{dims:a,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(s/64)},programUniforms:f}),getShaderSource:c}},_c=e=>fe({reduction:e.reduction}),bc=(e,t)=>{e.compute(xl(e.inputs,t),{inputs:[e.inputs[1],e.inputs[2]],outputs:[]})}}),Tl,Sl,Il,ln,kl,El,Cl,zl,Al,Ol,Bl,Rl,dn,Dl,Nl,Ml,Pl,Ul,wc,$c,Pg=U(()=>{J(),re(),$e(),ie(),Tl=(e,t)=>{if(e.every(r=>r>0||(()=>{throw new Error("Resize requires scales input values to be positive")})),e.length>0){if(t.mode==="linear"){if(!(e.length===2||e.length===3||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1||e.length===5&&e[0]===1&&e[1]===1))throw new Error(`For linear mode, Resize requires scales to be 2D, 3D, 4D with either two outermost or one innermost and
            one outermost scale values equal to 1, or 5D with two outermost scale values equal to 1`)}else if(t.mode==="cubic"&&!(e.length===2||e.length===4&&e[0]===1&&e[1]===1||e.length===4&&e[0]===1&&e[3]===1))throw new Error("Resize requires scales input size to be 2 or 4 for cubic mode")}},Sl=(e,t,r)=>{t.every(a=>a>=0&&a<r||(()=>{throw new Error("Resize requires axes input values to be positive and less than rank")}));let n=new Array(r).fill(1);return t.forEach((a,i)=>n[a]=e[i]),n},Il=(e,t,r,n,a,i)=>{let[s,u,d]=r>10?[1,2,3]:[-1,e.length>1?1:-1,-1],l=e[0].dims.length;if(s>0&&e.length>s&&e[s].dims.length>0)e[s].getFloat32Array().forEach(f=>i.push(f));else if(t.coordinateTransformMode==="tf_crop_and_resize")throw new Error("Resize requires RoI input to be specified when coordinateTransformMode is tfCropAndResize");if(u>0&&e.length>u&&e[u].dims.length===1&&e[u].dims[0]>0){if(e[u].getFloat32Array().forEach(f=>n.push(f)),n.length!==0&&n.length!==l&&r>=18&&n.length!==t.axes.length)throw new Error("Resize requires scales input size to be same as input rank or axes size for opset 18 and up");Tl(n,t),t.axes.length>0&&Sl(n,t.axes,l).forEach((f,c)=>n[c]=f)}if(d>0&&e.length>d&&e[d].dims.length===1&&e[d].dims[0]>0&&(e[d].getBigInt64Array().forEach(f=>a.push(Number(f))),a.length!==0&&a.length!==l&&r>=18&&a.length!==t.axes.length))throw new Error("Resize requires sizes input size to be same as input rank or axes size for opset 18 and up");if(t.axes.length>0){if(n.length!==0&&n.length!==t.axes.length)throw new Error('Resize requires "scales" input size to be of axes rank when axes attributes is specified');if(a.length!==0&&a.length!==t.axes.length)throw new Error('Resize requires "sizes" input size to be of rank axes rank when axes attributes is specified')}if(typeof n<"u"&&typeof a<"u"&&n.length>0&&a.length>l)throw new Error("Resize requires only of scales or sizes to be specified")},ln=(e,t,r,n)=>`
  // The whole part and the fractional part are calculated separately due to inaccuracy of floating
  // point division. As an example, f32(21) / f32(7) may evaluate to 2.99... instead of 3, causing an
  // offset-by-one error later in floor().
  let big = (${e}) * (${t});
  let whole = ${n}(big / (${r}));
  let fract = ${n}(big % (${r})) / ${n}(${r});
  return whole + fract;
`,kl=(e,t)=>`fn getOriginalCoordinateFromResizedCoordinate(xResized: u32, xScale: f32, lengthResized: u32,
     lengthOriginal: u32, roiStart: f32, roiEnd: f32) -> ${t} { `+(()=>{switch(e){case"asymmetric":return`
          if (xScale < 1.0 || floor(xScale) != xScale) {
            return ${t}(xResized) / ${t}(xScale);
          } else {
            ${ln("xResized","lengthOriginal","lengthResized",t)}
          }
        `;case"pytorch_half_pixel":return`if (lengthResized > 1) {
                    return (${t}(xResized) + 0.5) / ${t}(xScale) - 0.5;
                  } else {
                    return 0.0;
                  }`;case"tf_half_pixel_for_nn":return`return (${t}(xResized) + 0.5) / ${t}(xScale);`;case"align_corners":return`if (lengthResized == 1) {
                    return 0.0;
                  } else {
                    ${ln("xResized","lengthOriginal - 1","lengthResized - 1",t)}
                  }`;case"tf_crop_and_resize":return`if (lengthResized > 1) {
                    return ${t}(roiStart) * ${t}(lengthOriginal - 1) +
                        (${t}(xResized) * ${t}(roiEnd - roiStart) * ${t}(lengthOriginal - 1)) /
                        ${t}(lengthResized - 1);
                  } else {
                    return 0.5 * ${t}(roiStart + roiEnd) * ${t}(lengthOriginal - 1);
                  }`;case"half_pixel_symmetric":return`const outputWidth = ${t}xScale * ${t}(lengthResized);
                  const adjustment = ${t}(lengthResized) / outputWidth;
                  const center = ${t}(lengthOriginal) / 2;
                  const offset = center * (1 - adjustment);
                  return offset + ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;case"half_pixel":return`return ((${t}(xResized) + 0.5) / ${t}(xScale)) - 0.5;`;default:throw new Error(`Coordinate transform mode ${e} is not supported`)}})()+"}",El=(e,t,r)=>`fn getNearestPixelFromOriginal(xOriginal: ${r}, isDownSample: bool) -> ${r} {`+(()=>{switch(e){case"round_prefer_ceil":return"if (fract(xOriginal) == 0.5) {             return ceil(xOriginal);           } else {             return round(xOriginal);           }";case"floor":return"return floor(xOriginal);";case"ceil":return"return ceil(xOriginal);";case"round_prefer_floor":return"if (fract(xOriginal) == 0.5) {                     return floor(xOriginal);                   } else {                     return round(xOriginal);                   }";case"simple":default:if(t<11)return"if (isDownSample)                     {                       return ceil(xOriginal);                     } else {                       return xOriginal;                     }";throw new Error(`Nearest mode ${e} is not supported`)}})()+"}",Cl=(e,t,r)=>{let n=new Array(r).fill(0).concat(new Array(r).fill(1)),a=e.length===0?n:e.slice();return t.length>0?(t.forEach((i,s)=>{n[i]=a[s],n[s+r]=a[t.length+s]}),n):a},zl=(e,t,r,n)=>{let a=[];if(r.length>0)if(n.length>0){if(e.forEach(i=>a.push(i)),Math.max(...n)>e.length)throw new Error("axes is out of bound");n.forEach((i,s)=>a[i]=r[s])}else r.forEach(i=>a.push(i));else{if(t.length===0)throw new Error("Resize requires either scales or sizes.");a=e.map((i,s)=>Math.round(i*t[s]))}return a},Al=(e,t,r)=>{let n=(()=>{switch(r.keepAspectRatioPolicy){case"not_larger":return r.axes.length>0?Math.min(...r.axes.map(i=>t[i]),Number.MAX_VALUE):Math.min(...t,Number.MAX_VALUE);case"not_smaller":return r.axes.length>0?Math.max(...r.axes.map(i=>t[i]),Number.MIN_VALUE):Math.max(...t,Number.MIN_VALUE);default:throw new Error(`Keep aspect ratio policy ${r.keepAspectRatioPolicy} is not supported`)}})();t.fill(1,0,t.length);let a=e.slice();return r.axes.length>0?(r.axes.forEach(i=>t[i]=n),r.axes.forEach(i=>a[i]=Math.round(e[i]*t[i]))):(t.fill(n,0,t.length),a.forEach((i,s)=>a[s]=Math.round(i*t[s]))),a},Ol=(e,t,r,n,a)=>`
    fn calculateOriginalIndicesFromOutputIndices(output_indices: ${e.type.indices}) -> array<${e.type.value}, ${r.length}> {
      var original_indices: array<${e.type.value}, ${r.length}>;
      for (var i:u32 = 0; i < ${r.length}; i++) {
        var output_index = ${e.indicesGet("output_indices","i")};
        var scale = ${F("uniforms.scales","i",n)};
        var roi_low = ${F("uniforms.roi","i",a)};
        var roi_hi = ${F("uniforms.roi",`i + ${t.length}`,a)};
        if (scale == 1.0) {
          original_indices[i] = ${e.type.value}(output_index);
        } else {
          var input_shape_i = ${F("uniforms.input_shape","i",t.length)};
          var output_shape_i = ${F("uniforms.output_shape","i",r.length)};
          original_indices[i] = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                           input_shape_i, roi_low, roi_hi);
        }
      }
      return original_indices;
    }`,Bl=(e,t,r,n,a,i,s)=>`
    fn calculateInputIndicesFromOutputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
      var input_indices: ${e.type.indices};
      for (var i:u32 = 0; i < ${n.length}; i++) {
        var output_index = ${t.indicesGet("output_indices","i")};
        var input_index: u32;
        var scale = ${F("uniforms.scales","i",a)};
        if (scale == 1.0) {
          input_index = output_index;
        } else {
          var roi_low = ${F("uniforms.roi","i",i)};
          var roi_hi = ${F("uniforms.roi",`i + ${r.length}`,i)};
          var input_shape_i = ${F("uniforms.input_shape","i",r.length)};
          var output_shape_i = ${F("uniforms.output_shape","i",n.length)};
          var original_idx = getOriginalCoordinateFromResizedCoordinate(output_index, scale, output_shape_i,
                                                                        input_shape_i, roi_low, roi_hi);
          if (!${s} || (original_idx >= 0 && original_idx < ${t.type.value}(input_shape_i))) {
            if (original_idx < 0) {
              input_index = 0;
            } else if (original_idx > ${t.type.value}(input_shape_i - 1)) {
              input_index = input_shape_i - 1;
            } else {
              input_index = u32(getNearestPixelFromOriginal(original_idx, scale < 1));
            }
          } else {
            input_index = u32(original_idx);
          }
        }
        ${e.indicesSet("input_indices","i","input_index")}
      }
      return input_indices;
    }`,Rl=(e,t)=>`
    fn checkInputIndices(input_indices: ${e.type.indices}) -> bool {
      for (var i:u32 = 0; i < ${t.length}; i++) {
        var input_index = ${e.indicesGet("input_indices","i")};
        if (input_index < 0 || input_index >= ${F("uniforms.input_shape","i",t.length)}) {
          return false;
        }
      }
      return true;
    }`,dn=(e,t,r,n)=>e.rank>n?`
    ${e.indicesSet("input_indices",t,"channel")};
    ${e.indicesSet("input_indices",r,"batch")};
`:"",Dl=(e,t,r,n,a)=>{let[i,s,u,d]=r.length===2?[-1,0,1,-1]:[0,2,3,1],l=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, row: u32, col: u32) -> ${l} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet("input_indices",s,`max(0, min(row, ${r[s]} - 1))`)};
      ${e.indicesSet("input_indices",u,`max(0, min(col, ${r[u]} - 1))`)};
      ${dn(e,d,i,2)}
      return ${e.getByIndices("input_indices")};
    }

    fn bilinearInterpolation(output_indices: ${t.type.indices}) -> ${l} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var row:${l} = originalIndices[${s}];
      var col:${l} = originalIndices[${u}];
      ${n?`if (row < 0 || row > (${r[s]} - 1) || col < 0 || col > (${r[u]} - 1)) {
        return ${a};
      }`:""};
      row = max(0, min(row, ${r[s]} - 1));
      col = max(0, min(col, ${r[u]} - 1));
      var row1: u32 = u32(row);
      var col1: u32 = u32(col);
      var row2: u32 = u32(row + 1);
      var col2: u32 = u32(col + 1);
      var channel: u32 = ${r.length>2?`u32(originalIndices[${d}])`:"0"};
      var batch: u32 =  ${r.length>2?`u32(originalIndices[${i}])`:"0"};
      var x11: ${l} = getInputValue(batch, channel, row1, col1);
      var x12: ${l} = getInputValue(batch, channel, row1, col2);
      var x21: ${l} = getInputValue(batch, channel, row2, col1);
      var x22: ${l} = getInputValue(batch, channel, row2, col2);
      var dx1: ${l} = abs(row - ${l}(row1));
      var dx2: ${l} = abs(${l}(row2) - row);
      var dy1: ${l} = abs(col - ${l}(col1));
      var dy2: ${l} = abs(${l}(col2) - col);
      if (row1 == row2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (col1 == col2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      return (x11 * dx2 * dy2 + x12 * dx2 * dy1 + x21 * dx1 * dy2 + x22 * dx1 * dy1);
    }`},Nl=(e,t,r,n,a,i,s,u,d,l)=>{let f=r.length===2,[c,h]=f?[0,1]:[2,3],g=e.type.value,y=b=>{let x=b===c?"row":"col";return`
      fn ${x}CubicInterpolation(input_indices: ${e.type.indices}, output_indices: ${t.type.indices}) -> ${g} {
        var output_index = ${t.indicesGet("output_indices",b)};
        var originalIdx: ${g} = getOriginalCoordinateFromResizedCoordinate(output_index, ${a[b]},
        ${n[b]}, ${r[b]}, ${i[b]}, ${i[b]} + ${r.length});
        var fractOriginalIdx: ${g} = originalIdx - floor(originalIdx);
        var coefs = getCubicInterpolationCoefs(fractOriginalIdx);

        if (${u} && (originalIdx < 0 || originalIdx > (${r[b]} - 1))) {
          return ${d};
        }
        var data: array<${g}, 4> = array<${g}, 4>(0.0, 0.0, 0.0, 0.0);
        for (var i: i32 = -1; i < 3; i++) {
          var ${x}: ${g} = originalIdx + ${g}(i);
          if (${x} < 0 || ${x} >= ${r[b]}) {
            ${l?`coefs[i + 1] = 0.0;
                        continue;`:u?`return ${d};`:`${x} = max(0, min(${x}, ${r[b]} - 1));`};
          }
        var input_indices_copy: ${e.type.indices} = input_indices;
          ${e.indicesSet("input_indices_copy",b,`u32(${x})`)};
          data[i + 1] = ${b===c?e.getByIndices("input_indices_copy"):"rowCubicInterpolation(input_indices_copy, output_indices)"};
        }
        return cubicInterpolation1D(data, coefs);
      }`};return`
    ${y(c)};
    ${y(h)};
  fn getCubicInterpolationCoefs(s: ${g}) -> array<${g}, 4> {
    var absS = abs(s);
    var coeffs: array<${g}, 4> = array<${g}, 4>(0.0, 0.0, 0.0, 0.0);
    var oneMinusAbsS: ${g} = 1.0 - absS;
    var twoMinusAbsS: ${g} = 2.0 - absS;
    var onePlusAbsS: ${g} = 1.0 + absS;
    coeffs[0] = ((${s} * onePlusAbsS - 5 * ${s}) * onePlusAbsS + 8 * ${s}) * onePlusAbsS - 4 * ${s};
    coeffs[1] = ((${s} + 2) * absS - (${s} + 3)) * absS * absS + 1;
    coeffs[2] = ((${s} + 2) * oneMinusAbsS - (${s} + 3)) * oneMinusAbsS * oneMinusAbsS + 1;
    coeffs[3] = ((${s} * twoMinusAbsS - 5 * ${s}) * twoMinusAbsS + 8 * ${s}) * twoMinusAbsS - 4 * ${s};
    return coeffs;
  }

  fn cubicInterpolation1D(x: array<${g}, 4>, coefs: array<${g}, 4>) -> ${g} {
    var coefsSum: ${g} = coefs[0] + coefs[1] + coefs[2] + coefs[3];
    return (x[0] * coefs[0] + x[1] * coefs[1]+ x[2] * coefs[2]+ x[3] * coefs[3]) / coefsSum;
  }

  fn bicubicInterpolation(output_indices: ${t.type.indices}) -> ${g} {
    var input_indices: ${e.type.indices} = output_indices;
    return colCubicInterpolation(input_indices, output_indices);
  }
    `},Ml=(e,t,r,n,a)=>{let[i,s,u,d,l]=r.length===3?[-1,0,1,2,-1]:[0,2,3,4,1],f=e.type.value;return`
    fn getInputValue(batch: u32, channel: u32, depth:u32, height: u32, width: u32) -> ${f} {
      var input_indices: ${e.type.indices};
      ${e.indicesSet("input_indices",s,`max(0, min(depth, ${r[s]} - 1))`)};
      ${e.indicesSet("input_indices",u,`max(0, min(height, ${r[u]} - 1))`)};
      ${e.indicesSet("input_indices",d,`max(0, min(width, ${r[d]} - 1))`)};
      ${dn(e,l,i,3)}
      return ${e.getByIndices("input_indices")};
    }

    fn trilinearInterpolation(output_indices: ${t.type.indices}) -> ${f} {
      var originalIndices = calculateOriginalIndicesFromOutputIndices(output_indices);
      var depth:${f} = originalIndices[${s}];
      var height:${f} = originalIndices[${u}];
      var width:${f} = originalIndices[${d}];
      ${n?`if (depth < 0 || depth > (${r[s]} - 1) || height < 0 || height > (${r[u]} - 1) || width < 0 || (width > ${r[d]} - 1)) {
      return ${a};
        }`:""};

    depth = max(0, min(depth, ${r[s]} - 1));
      height = max(0, min(height, ${r[u]} - 1));
      width = max(0, min(width, ${r[d]} - 1));
      var depth1: u32 = u32(depth);
      var height1: u32 = u32(height);
      var width1: u32 = u32(width);
      var depth2: u32 = u32(depth + 1);
      var height2: u32 = u32(height + 1);
      var width2: u32 = u32(width + 1);
      var channel: u32 = ${r.length>3?`u32(originalIndices[${l}])`:"0"};
      var batch: u32 =  ${r.length>3?`u32(originalIndices[${i}])`:"0"};

      var x111: ${f} = getInputValue(batch, channel, depth1, height1, width1);
      var x112: ${f} = getInputValue(batch, channel, depth1, height1, width2);
      var x121: ${f} = getInputValue(batch, channel, depth1, height2, width1);
      var x122: ${f} = getInputValue(batch, channel, depth1, height2, width2);
      var x211: ${f} = getInputValue(batch, channel, depth2, height1, width1);
      var x212: ${f} = getInputValue(batch, channel, depth2, height1, width2);
      var x221: ${f} = getInputValue(batch, channel, depth2, height2, width1);
      var x222: ${f} = getInputValue(batch, channel, depth2, height2, width2);
      var dx1: ${f} = abs(depth - ${f}(depth1));
      var dx2: ${f} = abs(${f}(depth2) - depth);
      var dy1: ${f} = abs(height - ${f}(height1));
      var dy2: ${f} = abs(${f}(height2) - height);
      var dz1: ${f} = abs(width - ${f}(width1));
      var dz2: ${f} = abs(${f}(width2) - width);
      if (depth1 == depth2) {
        dx1 = 0.5;
        dx2 = 0.5;
      }
      if (height1 == height2) {
        dy1 = 0.5;
        dy2 = 0.5;
      }
      if (width1 == width2) {
        dz1 = 0.5;
        dz2 = 0.5;
      }
      return (x111 * dx2 * dy2 * dz2 + x112 * dx2 * dy2 * dz1 + x121 * dx2 * dy1 *dz2 + x122 * dx2 * dy1 * dz1 +
              x211 * dx1 * dy2 * dz2 + x212 * dx1 * dy2 * dz1 + x221 * dx1 * dy1 *dz2 + x222 * dx1 * dy1 * dz1);
    }`},Pl=(e,t,r,n,a,i)=>{let s=e.dims,u=Cl(i,t.axes,s.length),d=zl(s,n,a,t.axes),l=n.slice();n.length===0&&(l=s.map((w,S)=>w===0?1:d[S]/w),t.keepAspectRatioPolicy!=="stretch"&&(d=Al(s,l,t)));let f=H("output",e.dataType,d.length),c=R("input",e.dataType,s.length),h=z.size(d),g=s.length===d.length&&s.every((w,S)=>w===d[S]),y=t.coordinateTransformMode==="tf_crop_and_resize",b=t.extrapolationValue,x=c.type.value,$=w=>`
      ${g?"":`
      ${kl(t.coordinateTransformMode,x)};
      ${(()=>{switch(t.mode){case"nearest":return`
              ${Rl(c,s)};
              ${El(t.nearestMode,r,x)};
              ${Bl(c,f,s,d,l.length,u.length,y)};
              `;case"linear":return`
              ${Ol(f,s,d,l.length,u.length)};
              ${(()=>{if(s.length===2||s.length===4)return`${Dl(c,f,s,y,b)}`;if(s.length===3||s.length===5)return`${Ml(c,f,s,y,b)}`;throw Error("Linear mode only supports input dims 2, 3, 4 and 5 are supported in linear mode.")})()};
            `;case"cubic":return`
            ${(()=>{if(s.length===2||s.length===4)return`${Nl(c,f,s,d,l,u,t.cubicCoeffA,y,t.extrapolationValue,t.excludeOutside)}`;throw Error("Cubic mode only supports input dims 2 and 4 are supported in linear mode.")})()};
            `;default:throw Error("Invalid resize mode")}})()};
      `}
      ${w.registerUniform("output_size","u32").registerUniform("scales","f32",l.length).registerUniform("roi","f32",u.length).declareVariables(c,f)}
      ${w.mainStart()}
        ${w.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
        ${g?"output[global_idx] = input[global_idx];":`
        let output_indices = ${f.offsetToIndices("global_idx")};
        var input_indices: ${c.type.indices};
        ${(()=>{switch(t.mode){case"nearest":return`input_indices = calculateInputIndicesFromOutputIndices(output_indices);
                if (checkInputIndices(input_indices)) {
                  output[global_idx] = ${c.getByIndices("input_indices")};
                } else {
                  output[global_idx] = ${t.extrapolationValue};
                }`;case"linear":return`output[global_idx] = ${s.length===2||s.length===4?"bilinearInterpolation":"trilinearInterpolation"}(output_indices);`;case"cubic":return"output[global_idx] = bicubicInterpolation(output_indices);";default:throw Error(`Unsupported resize mode: ${t.mode}`)}})()};
`}
      }`;return{name:"Resize",shaderCache:{hint:`${t.cacheKey}|${r}|${l.length>0?t.mode==="cubic"?l:l.length:""}|${a.length>0?a:""}|${u.length>0?u:""}|${g}|${t.mode==="nearest"?s.length:s}`,inputDependencies:["rank"]},getShaderSource:$,getRunData:()=>({outputs:[{dims:d,dataType:e.dataType}],dispatchGroup:{x:Math.ceil(h/64)},programUniforms:[{type:12,data:h},{type:1,data:l},{type:1,data:u},...Z(s,d)]})}},Ul=e=>{let t=e.customDataBuffer;return new Uint32Array(t,t.byteOffset,1)[0]},wc=(e,t)=>{let r=[],n=[],a=[],i=Ul(e);if(t.antialias!==0)throw Error("Only default value (0) for Antialias attribute is supported");Il(e.inputs,t,i,r,n,a),e.compute(Pl(e.inputs[0],t,i,r,n,a),{inputs:[0]})},$c=e=>{let t=e.antialias,r=e.axes,n=e.coordinateTransformMode,a=e.cubicCoeffA,i=e.excludeOutside!==0,s=e.extrapolationValue,u=e.keepAspectRatioPolicy,d=e.mode,l=e.nearestMode===""?"simple":e.nearestMode;return fe({antialias:t,axes:r,coordinateTransformMode:n,cubicCoeffA:a,excludeOutside:i,extrapolationValue:s,keepAspectRatioPolicy:u,mode:d,nearestMode:l})}}),Wl,Ll,vc,Ug=U(()=>{J(),re(),ie(),Wl=e=>{if(!e||e.length<3)throw new Error("layerNorm requires at least 3 inputs.");let t=e[0],r=e[1],n=e[2];if(t.dataType!==r.dataType||t.dataType!==n.dataType)throw new Error("All inputs must have the same data type");if(t.dims.length!==3&&t.dims.length!==2)throw new Error("Input must be 2D or 3D");if(r.dims.length!==3&&r.dims.length!==2)throw new Error("Skip must be 2D or 3D");let a=t.dims[t.dims.length-1],i=t.dims[t.dims.length-2];if(r.dims[r.dims.length-1]!==a)throw new Error("Skip must have the same hidden size as input");if(r.dims[r.dims.length-2]!==i)throw new Error("Skip must have the same sequence length as input");if(n.dims.length!==1)throw new Error("Gamma must be 1D");if(n.dims[n.dims.length-1]!==a)throw new Error("Gamma must have the same hidden size as input");if(e.length>3){let s=e[3];if(s.dims.length!==1)throw new Error("Beta must be 1D");if(s.dims[s.dims.length-1]!==a)throw new Error("Beta must have the same hidden size as input")}if(e.length>4){let s=e[4];if(s.dims.length!==1)throw new Error("Bias must be 1D");if(s.dims[s.dims.length-1]!==a)throw new Error("Bias must have the same hidden size as input")}},Ll=(e,t,r,n)=>{let a=t.simplified,i=e[0].dims,s=z.size(i),u=i,d=s,l=i.slice(-1)[0],f=n?i.slice(0,-1).concat(1):[],c=!a&&e.length>3,h=e.length>4,g=n&&r>1,y=n&&r>2,b=r>3,x=64,$=we(l),w=[{type:12,data:d},{type:12,data:$},{type:12,data:l},{type:1,data:t.epsilon}],S=I=>{let E=[{name:"output_size",type:"u32"},{name:"components",type:"u32"},{name:"hidden_size",type:"u32"},{name:"epsilon",type:"f32"}],C=[R("x",e[0].dataType,e[0].dims,$),R("skip",e[1].dataType,e[1].dims,$),R("gamma",e[2].dataType,e[2].dims,$)];c&&C.push(R("beta",e[3].dataType,e[3].dims,$)),h&&C.push(R("bias",e[4].dataType,e[4].dims,$)),C.push(H("output",e[0].dataType,u,$)),g&&C.push(H("mean_output",1,f)),y&&C.push(H("inv_std_output",1,f)),b&&C.push(H("input_skip_bias_sum",e[0].dataType,u,$));let A=Te(e[0].dataType),O=Te(1,$);return`

      ${I.registerUniforms(E).declareVariables(...C)}
      var<workgroup> sum_shared : array<${O}, ${x}>;
      var<workgroup> sum_squared_shared : array<${O}, ${x}>;

      ${I.mainStart([x,1,1])}
        let ix = local_id.x;
        let iy = global_id.x / ${x};

        let hidden_size_vectorized: u32 = uniforms.hidden_size / uniforms.components;
        var stride = hidden_size_vectorized / ${x};
        let offset = ix * stride + iy * hidden_size_vectorized;
        let offset1d = stride * ix;
        if (ix == ${x-1}) {
          stride = hidden_size_vectorized - stride * ix;
        }
        for (var i: u32 = 0; i < stride; i++) {
          let skip_value = skip[offset + i];
          let bias_value = ${h?"bias[offset1d + i]":A+"(0.0)"};
          let input_value = x[offset + i];
          let value = input_value + skip_value + bias_value;
          ${b?"input_skip_bias_sum[offset + i] = value;":""}
          output[offset + i] = value;
          let f32_value = ${Wt(A,$,"value")};
          sum_shared[ix] += f32_value;
          sum_squared_shared[ix] += f32_value * f32_value;
        }
        workgroupBarrier();

        var reduce_size : u32 = ${x};
        for (var curr_size = reduce_size >> 1;  curr_size > 0; curr_size = reduce_size >> 1) {
          reduce_size = curr_size + (reduce_size & 1);
          if (ix < curr_size) {
            sum_shared[ix] += sum_shared[ix + reduce_size];
            sum_squared_shared[ix] += sum_squared_shared[ix + reduce_size];
          }
          workgroupBarrier();
        }

        let sum = sum_shared[0];
        let square_sum = sum_squared_shared[0];
        let mean = ${gt("sum",$)} / f32(uniforms.hidden_size);
        let inv_std_dev = inverseSqrt(${gt("square_sum",$)} / f32(uniforms.hidden_size) ${a?"":"- mean * mean"} + uniforms.epsilon);
        ${g?"mean_output[global_idx] = mean;":""}
        ${y?"inv_std_output[global_idx] = inv_std_dev;":""}

        for (var i: u32 = 0; i < stride; i++) {
          output[offset + i] = (output[offset + i] ${a?"":`- ${A}(mean)`}) *
            ${A}(inv_std_dev) * gamma[offset1d + i]
            ${c?"+ beta[offset1d + i]":""};
        }
      }`},T=[{dims:u,dataType:e[0].dataType}];return r>1&&T.push({dims:f,dataType:1}),r>2&&T.push({dims:f,dataType:1}),r>3&&T.push({dims:i,dataType:e[0].dataType}),{name:"SkipLayerNormalization",shaderCache:{hint:`${$};${g};${y};${b}`,inputDependencies:e.map((I,E)=>"type")},getShaderSource:S,getRunData:()=>({outputs:T,dispatchGroup:{x:Math.ceil(d/l)},programUniforms:w})}},vc=(e,t)=>{Wl(e.inputs);let r=[0];e.outputCount>1&&r.push(-3),e.outputCount>2&&r.push(-3),e.outputCount>3&&r.push(3),e.compute(Ll(e.inputs,t,e.outputCount,!1),{outputs:r})}}),ql,rr,Vl,pn,jl,Gl,xc,Tc,Wg=U(()=>{J(),re(),$e(),ie(),ql=(e,t)=>{if(!e||e.length<1)throw new Error("too few inputs");if(t.axes.length!==0){if(t.axes.length!==t.starts.length||t.axes.length!==t.ends.length)throw new Error("axes, starts and ends must have the same length")}else if(t.starts.length!==t.ends.length)throw new Error("starts and ends must have the same length");e.slice(1).forEach((r,n)=>{if(e[n+1].dataType!==6&&e[n+1].dataType!==7)throw new Error(`Input ${n} must be an array of int32 or int64`)})},rr=(e,t)=>{let r=[];if(e.length>t)if(e[t].dataType===7)e[t].getBigInt64Array().forEach(n=>r.push(Number(n)));else if(e[t].dataType===6)e[t].getInt32Array().forEach(n=>r.push(Number(n)));else throw new Error(`Input ${t} must be an array of int32 or int64`);return r},Vl=(e,t)=>{if(e.length>1){let r=rr(e,1),n=rr(e,2),a=rr(e,3);return a.length===0&&(a=[...Array(e[0].dims.length).keys()]),fe({starts:r,ends:n,axes:a})}else return t},pn=(e,t,r,n,a)=>{let i=e;return e<0&&(i+=r[n[t]]),a[t]<0?Math.max(0,Math.min(i,r[n[t]]-1)):Math.max(0,Math.min(i,r[n[t]]))},jl=(e,t,r)=>`fn calculateInputIndices(output_indices: ${t.type.indices}) -> ${e.type.indices} {
          var input_indices: ${e.type.indices};
          var carry = 0u;
          for (var i = ${r.length}; i >= 0; i--) {
            let input_shape_i = ${F("uniforms.input_shape","i",r.length)};
            let steps_i = ${F("uniforms.steps","i",r.length)};
            let signs_i = ${F("uniforms.signs","i",r.length)};
            let starts_i = ${F("uniforms.starts","i",r.length)};
            var output_index = ${t.indicesGet("output_indices","i")};
            var input_index = output_index * steps_i + starts_i + carry;
            carry = input_index / input_shape_i;
            input_index = input_index % input_shape_i;
            if (signs_i < 0) {
              input_index = input_shape_i - input_index - 1u + starts_i;
            }
            ${e.indicesSet("input_indices","i","input_index")};
          }
          return input_indices;
      }`,Gl=(e,t)=>{let r=e[0].dims,n=z.size(r),a=t.axes.length>0?z.normalizeAxes(t.axes,r.length):[...Array(r.length).keys()],i=rr(e,4);i.forEach($=>$!==0||(()=>{throw new Error("step cannot be 0")})),i.length===0&&(i=Array(a.length).fill(1));let s=t.starts.map(($,w)=>pn($,w,r,a,i)),u=t.ends.map(($,w)=>pn($,w,r,a,i));if(a.length!==s.length||a.length!==u.length)throw new Error("start, ends and axes should have the same number of elements");if(a.length!==r.length)for(let $=0;$<r.length;++$)a.includes($)||(s.splice($,0,0),u.splice($,0,r[$]),i.splice($,0,1));let d=i.map($=>Math.sign($));i.forEach(($,w,S)=>{if($<0){let T=(u[w]-s[w])/$,I=s[w],E=I+T*i[w];s[w]=E,u[w]=I,S[w]=-$}});let l=r.slice(0);a.forEach(($,w)=>{l[$]=Math.ceil((u[$]-s[$])/i[$])});let f={dims:l,dataType:e[0].dataType},c=H("output",e[0].dataType,l.length),h=R("input",e[0].dataType,e[0].dims.length),g=z.size(l),y=[{name:"outputSize",type:"u32"},{name:"starts",type:"u32",length:s.length},{name:"signs",type:"i32",length:d.length},{name:"steps",type:"u32",length:i.length}],b=[{type:12,data:g},{type:12,data:s},{type:6,data:d},{type:12,data:i},...Z(e[0].dims,l)],x=$=>`
      ${$.registerUniforms(y).declareVariables(h,c)}
        ${jl(h,c,r)}
        ${$.mainStart()}
          ${$.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.outputSize")}
          let output_indices = ${c.offsetToIndices("global_idx")};
          let input_indices = calculateInputIndices(output_indices);
          ${c.setByOffset("global_idx",h.getByIndices("input_indices"))}
      }`;return{name:"Slice",shaderCache:{hint:`${d.length}_${s.length}_${i.length}`,inputDependencies:["rank"]},getShaderSource:x,getRunData:()=>({outputs:[f],dispatchGroup:{x:Math.ceil(n/64)},programUniforms:b})}},xc=(e,t)=>{ql(e.inputs,t);let r=Vl(e.inputs,t);e.compute(Gl(e.inputs,r),{inputs:[0]})},Tc=e=>{let t=e.starts,r=e.ends,n=e.axes;return fe({starts:t,ends:r,axes:n})}}),Hl,Fl,Sc,Ic,Lg=U(()=>{J(),re(),$e(),yt(),ie(),Hl=e=>{if(!e||e.length!==1)throw new Error("Softmax op requires 1 input.")},Fl=(e,t)=>{let r=e.inputs[0],n=r.dims,a=z.size(n),i=n.length,s=z.normalizeAxis(t.axis,i),u=s<n.length-1,d,l=[];u?(l=Array.from({length:i},(C,A)=>A),l[s]=i-1,l[i-1]=s,d=e.compute(De(r,l),{inputs:[r],outputs:[-1]})[0]):d=r;let f=d.dims,c=f[i-1],h=a/c,g=we(c),y=c/g,b=64;h===1&&(b=256);let x=(C,A)=>A===4?`max(max(${C}.x, ${C}.y), max(${C}.z, ${C}.w))`:A===2?`max(${C}.x, ${C}.y)`:A===3?`max(max(${C}.x, ${C}.y), ${C}.z)`:C,$=R("x",d.dataType,d.dims,g),w=H("result",d.dataType,d.dims,g),S=$.type.value,T=Te(d.dataType)==="f32"?`var threadMax = ${S}(-3.402823e+38f);`:`var threadMax = ${S}(-65504.0h);`,I=C=>`
      var<workgroup> rowMaxShared : ${S};
      var<workgroup> rowSumShared : ${S};
      var<workgroup> threadShared : array<${S}, ${b}>;

      fn getValue(row: i32, col: i32, row_stride: i32) -> ${S} {
        let index = row * row_stride + col;
        return x[index];
      }

      fn setValue(row: i32, col: i32, row_stride: i32, value: ${S}) {
        let index = row * row_stride + col;
        result[index] = value;
      }
      ${C.registerUniform("packedCols","i32").declareVariables($,w)}
      ${C.mainStart(b)}
        let gindex = i32(global_idx);
        let lindex = i32(local_idx);
        const wg = ${b};
        let row = gindex / wg;
        let cols = uniforms.packedCols;
        let row_stride : i32 = uniforms.packedCols;

        // find the rows max
        ${T}
        for (var col = lindex; col < cols; col += wg) {
          let value = getValue(row, col, row_stride);
          threadMax = max(threadMax, value);
        }
        if (lindex < cols) {
          threadShared[lindex] = threadMax;
        }
        workgroupBarrier();

        var reduceSize = min(cols, wg);
        for (var currSize = reduceSize >> 1;  currSize > 0; currSize = reduceSize >> 1) {
          reduceSize = currSize + (reduceSize & 1);
          if (lindex < currSize) {
            threadShared[lindex] = max(threadShared[lindex], threadShared[lindex + reduceSize]);
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowMaxShared = ${S}(${x("threadShared[0]",g)});
        }
        workgroupBarrier();

        // find the rows sum
        var threadSum = ${S}(0.0);
        for (var col = lindex; col < cols; col += wg) {
          let subExp = exp(getValue(row, col, row_stride) - rowMaxShared);
          threadSum += subExp;
        }
        threadShared[lindex] = threadSum;
        workgroupBarrier();

        for (var currSize = wg >> 1;  currSize > 0; currSize = currSize >> 1) {
          if (lindex < currSize) {
            threadShared[lindex] = threadShared[lindex] + threadShared[lindex + currSize];
          }
          workgroupBarrier();
        }
        if (lindex == 0) {
          rowSumShared = ${S}(${gt("threadShared[0]",g)});
        }
        workgroupBarrier();

        // calculate final value for each element in the row
        for (var col = lindex; col < cols; col += wg) {
          let value = exp(getValue(row, col, row_stride) - rowMaxShared) / rowSumShared;
          setValue(row, col, row_stride, value);
        }
      }`,E=e.compute({name:"Softmax",shaderCache:{hint:`${g};${b}`,inputDependencies:["type"]},getRunData:()=>({outputs:[{dims:f,dataType:d.dataType}],dispatchGroup:{x:h},programUniforms:[{type:6,data:y}]}),getShaderSource:I},{inputs:[d],outputs:[u?-1:0]})[0];u&&e.compute(De(E,l),{inputs:[E]})},Sc=(e,t)=>{Hl(e.inputs),Fl(e,t)},Ic=e=>fe({axis:e.axis})}),fn,Kl,Zl,Ql,kc,qg=U(()=>{J(),re(),ie(),fn=e=>Array.from(e.getBigInt64Array(),Number),Kl=e=>{if(!e||e.length!==2)throw new Error("Tile requires 2 inputs.");if(e[0].dataType!==1&&e[0].dataType!==10&&e[0].dataType!==6&&e[0].dataType!==12)throw new Error("Tile only support float, float16, int32, and uint32 data types");if(e[1].dataType!==7)throw new Error("Tile `repeats` input should be of int64 data type");if(e[1].dims.length!==1)throw new Error("Tile `repeats` input should be 1-D");if(fn(e[1]).length!==e[0].dims.length)throw new Error("Tile `repeats` input should have same number of elements as rank of input data tensor")},Zl=(e,t)=>{let r=[];for(let n=0;n<e.length;++n)r.push(e[n]*t[n]);return r},Ql=(e,t)=>{let r=e[0].dims,n=t??fn(e[1]),a=Zl(r,n),i=z.size(a),s=e[0].dataType,u=R("input",s,r.length),d=H("output",s,a.length),l=f=>`
      const inputShape = ${u.indices(...r)};
      ${f.registerUniform("output_size","u32").declareVariables(u,d)}
      ${f.mainStart()}
      ${f.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.output_size")}
      let output_indices = ${d.offsetToIndices("global_idx")};
      var input_indices: ${u.type.indices};
      for (var i = 0; i < ${r.length}; i++) {
        let input_dim_i = ${u.indicesGet("uniforms.input_shape","i")};
        let input_dim_value = ${d.indicesGet("output_indices","i")}  % input_dim_i;

        ${u.indicesSet("input_indices","i","input_dim_value")}
      }
      ${d.setByOffset("global_idx",u.getByIndices("input_indices"))}
    }`;return{name:"Tile",shaderCache:{hint:`${n}`,inputDependencies:["rank"]},getRunData:()=>({outputs:[{dims:a,dataType:e[0].dataType}],dispatchGroup:{x:Math.ceil(i/64)},programUniforms:[{type:12,data:i},...Z(e[0].dims,a)]}),getShaderSource:l}},kc=e=>{Kl(e.inputs),e.compute(Ql(e.inputs),{inputs:[0]})}}),Xl,Yl,Ec,Vg=U(()=>{J(),re(),ie(),Xl=(e,t,r,n,a)=>{let i=H("output_data",a,r.length,4),s=R("a_data",t[1].dataType,t[1].dims.length,4),u=R("b_data",t[2].dataType,t[2].dims.length,4),d=R("c_data",t[0].dataType,t[0].dims.length,4),l,f=(c,h,g)=>`select(${h}, ${c}, ${g})`;if(!n)l=i.setByOffset("global_idx",f(s.getByOffset("global_idx"),u.getByOffset("global_idx"),d.getByOffset("global_idx")));else{let c=(h,g,y="")=>{let b=`a_data[index_a${g}][component_a${g}]`,x=`b_data[index_b${g}][component_b${g}]`,$=`bool(c_data[index_c${g}] & (0xffu << (component_c${g} * 8)))`;return`
            let output_indices${g} = ${i.offsetToIndices(`global_idx * 4u + ${g}u`)};
            let offset_a${g} = ${s.broadcastedIndicesToOffset(`output_indices${g}`,i)};
            let offset_b${g} = ${u.broadcastedIndicesToOffset(`output_indices${g}`,i)};
            let offset_c${g} = ${d.broadcastedIndicesToOffset(`output_indices${g}`,i)};
            let index_a${g} = offset_a${g} / 4u;
            let index_b${g} = offset_b${g} / 4u;
            let index_c${g} = offset_c${g} / 4u;
            let component_a${g} = offset_a${g} % 4u;
            let component_b${g} = offset_b${g} % 4u;
            let component_c${g} = offset_c${g} % 4u;
            ${h}[${g}] = ${y}(${f(b,x,$)});
          `};a===9?l=`
            var data = vec4<u32>(0);
            ${c("data",0,"u32")}
            ${c("data",1,"u32")}
            ${c("data",2,"u32")}
            ${c("data",3,"u32")}
            output_data[global_idx] = dot(vec4<u32>(0x1, 0x100, 0x10000, 0x1000000), vec4<u32>(data));`:l=`
            ${c("output_data[global_idx]",0)}
            ${c("output_data[global_idx]",1)}
            ${c("output_data[global_idx]",2)}
            ${c("output_data[global_idx]",3)}
          `}return`
        ${e.registerUniform("vec_size","u32").declareVariables(d,s,u,i)}
        ${e.mainStart()}
        ${e.guardAgainstOutOfBoundsWorkgroupSizes("uniforms.vec_size")}
        ${l}
      }`},Yl=e=>{let t=e[1].dims,r=e[2].dims,n=e[0].dims,a=e[1].dataType,i=!(z.areEqual(t,r)&&z.areEqual(r,n)),s=t,u=z.size(t);if(i){let l=Lt.calcShape(Lt.calcShape(t,r,!1),n,!1);if(!l)throw new Error("Can't perform where op on the given tensors");s=l,u=z.size(s)}let d=Math.ceil(u/4);return{name:"Where",shaderCache:{inputDependencies:["rank","rank","rank"]},getShaderSource:l=>Xl(l,e,s,i,a),getRunData:()=>({outputs:[{dims:s,dataType:a}],dispatchGroup:{x:Math.ceil(u/64/4)},programUniforms:[{type:12,data:d},...Z(n,t,r,s)]})}},Ec=e=>{e.compute(Yl(e.inputs))}}),Cc,jg=U(()=>{ng(),Xn(),ag(),sg(),og(),ug(),lg(),hg(),gg(),yg(),_g(),bg(),wg(),$g(),vg(),xg(),Tg(),Sg(),Ig(),kg(),Eg(),Cg(),zg(),Ag(),Og(),Kf(),Bg(),Rg(),Dg(),Ng(),Mg(),Qn(),Pg(),Jf(),Ug(),Wg(),Lg(),Xf(),qg(),yt(),Yn(),Vg(),Cc=new Map([["Abs",[$p]],["Acos",[vp]],["Acosh",[xp]],["Add",[nf]],["ArgMax",[yp,Sn]],["ArgMin",[gp,Sn]],["Asin",[Tp]],["Asinh",[Sp]],["Atan",[Ip]],["Atanh",[kp]],["Attention",[_p]],["AveragePool",[uc,oc]],["BatchNormalization",[bp]],["BiasAdd",[wp]],["BiasSplitGelu",[rf]],["Cast",[Cp,Ep]],["Ceil",[Ap]],["Clip",[zp]],["Concat",[hf,mf]],["Conv",[An,zn]],["ConvTranspose",[Sf,Tf]],["Cos",[Op]],["Cosh",[Bp]],["CumSum",[If,kf]],["DepthToSpace",[Ef,Cf]],["DequantizeLinear",[mc,gc]],["Div",[af]],["Einsum",[zf,Af]],["Elu",[Rp,or]],["Equal",[sf]],["Erf",[Dp]],["Exp",[Np]],["Expand",[Of]],["FastGelu",[Bf]],["Floor",[Mp]],["FusedConv",[An,zn]],["Gather",[Df,Rf]],["GatherElements",[Lf,Wf]],["GatherBlockQuantized",[Pf,Uf]],["GatherND",[Nf,Mf]],["Gelu",[Pp]],["Gemm",[Vf,qf]],["GlobalAveragePool",[dc,lc]],["GlobalMaxPool",[hc,cc]],["Greater",[df]],["GreaterOrEqual",[ff]],["GridSample",[jf,Gf]],["GroupQueryAttention",[ec]],["HardSigmoid",[Hp,Gp]],["InstanceNormalization",[tc]],["LayerNormalization",[rc]],["LeakyRelu",[Up,or]],["Less",[pf]],["LessOrEqual",[cf]],["Log",[ef]],["MatMul",[ic]],["MatMulNBits",[nc,ac]],["MaxPool",[pc,fc]],["Mul",[of]],["MultiHeadAttention",[Ff,Hf]],["Neg",[Lp]],["Not",[Wp]],["Pad",[sc]],["Pow",[uf]],["QuickGelu",[tf,or]],["Range",[yc]],["Reciprocal",[qp]],["ReduceMin",[pp]],["ReduceMean",[sp]],["ReduceMax",[dp]],["ReduceSum",[cp]],["ReduceProd",[fp]],["ReduceL1",[op]],["ReduceL2",[up]],["ReduceLogSum",[mp]],["ReduceLogSumExp",[lp]],["ReduceSumSquare",[hp]],["Relu",[Vp]],["Resize",[wc,$c]],["RotaryEmbedding",[Yf]],["ScatterND",[bc,_c]],["Sigmoid",[jp]],["Sin",[Fp]],["Sinh",[Kp]],["Slice",[xc,Tc]],["SkipLayerNormalization",[vc]],["Split",[Zf,Qf]],["Sqrt",[Zp]],["Softmax",[Sc,Ic]],["Sub",[lf]],["Tan",[Qp]],["Tanh",[Xp]],["ThresholdedRelu",[Jp,or]],["Tile",[kc]],["Transpose",[Kd,Zd]],["Where",[Ec]]])}),zc,Gg=U(()=>{Qe(),st(),ie(),zc=class{constructor(e){this.backend=e,this.repo=new Map,this.attributesBound=!1}getArtifact(e){return this.repo.get(e)}setArtifact(e,t){this.repo.set(e,t)}run(e,t,r,n,a){Ze(e.programInfo.name);let i=this.backend.device,s=this.backend.getComputePassEncoder();this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2);let u=[];for(let l of t)u.push({binding:u.length,resource:{buffer:l.buffer}});for(let l of r)u.push({binding:u.length,resource:{buffer:l.buffer}});a&&u.push({binding:u.length,resource:a});let d=i.createBindGroup({layout:e.computePipeline.getBindGroupLayout(0),entries:u,label:e.programInfo.name});if(this.backend.sessionStatus==="capturing"){let l={kernelId:this.backend.currentKernelId,computePipeline:e.computePipeline,bindGroup:d,dispatchGroup:n};this.backend.capturedCommandList.get(this.backend.currentSessionId).push(l)}s.setPipeline(e.computePipeline),s.setBindGroup(0,d),s.dispatchWorkgroups(...n),this.backend.writeTimestamp(this.backend.pendingDispatchNumber*2+1),this.backend.pendingDispatchNumber++,(this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber||this.backend.queryType==="at-passes")&&this.backend.endComputePass(),this.backend.pendingDispatchNumber>=this.backend.maxDispatchNumber&&this.backend.flush(),We(e.programInfo.name)}dispose(){}build(e,t){Ze(e.name);let r=this.backend.device,n=[];[{feature:"shader-f16",extension:"f16"},{feature:"subgroups",extension:"subgroups"}].forEach(l=>{r.features.has(l.feature)&&n.push(`enable ${l.extension};`)});let a=Fd(t,this.backend.device.limits),i=e.getShaderSource(a),s=`${n.join(`
`)}
${a.additionalImplementations}
${i}`,u=r.createShaderModule({code:s,label:e.name});ue("verbose",()=>`[WebGPU] ${e.name} shader code: ${s}`);let d=r.createComputePipeline({compute:{module:u,entryPoint:"main"},layout:"auto",label:e.name});return We(e.name),{programInfo:e,computePipeline:d,uniformVariablesInfo:a.variablesInfo}}normalizeDispatchGroupSize(e){let t=typeof e=="number"?e:e.x,r=typeof e=="number"?1:e.y||1,n=typeof e=="number"?1:e.z||1,a=this.backend.device.limits.maxComputeWorkgroupsPerDimension;if(t<=a&&r<=a&&n<=a)return[t,r,n];let i=t*r*n,s=Math.ceil(Math.sqrt(i));if(s>a){if(s=Math.ceil(Math.cbrt(i)),s>a)throw new Error("Total dispatch size exceeds WebGPU maximum.");return[s,s,s]}else return[s,s,1]}}}),Ac={};Vt(Ac,{WebGpuBackend:()=>Oc});var Jl,ed,td,Oc,Hg=U(()=>{Qe(),J(),st(),qd(),rg(),jg(),Gg(),Jl=(e,t)=>{if(t.length!==e.length)throw new Error(`inputDependencies length ${t.length} is not equal to inputTensors length ${e.length}.`);let r=[];for(let n=0;n<e.length;++n){let a=e[n].dataType;switch(t[n]){case"none":{r.push("");break}case"type":{r.push(`${a}`);break}case"rank":{let i=e[n].dims.length;r.push(`${a};${i}`);break}case"dims":{let i=e[n].dims.join(",");r.push(`${a};${i}`);break}default:throw new Error(`unsupported input dependency: ${t[n]}`)}}return r.join("|")},ed=(e,t,r)=>{var a,i;let n=e.name;return(a=e.shaderCache)!=null&&a.hint&&(n+="["+e.shaderCache.hint+"]"),n+=":"+r+`:${Jl(t,((i=e.shaderCache)==null?void 0:i.inputDependencies)??new Array(t.length).fill("dims"))}`,n},td=class{constructor(e){e&&(this.architecture=e.architecture,this.vendor=e.vendor)}isArchitecture(e){return this.architecture===e}isVendor(e){return this.vendor===e}},Oc=class{constructor(){this.currentSessionId=null,this.currentKernelId=null,this.commandEncoder=null,this.computePassEncoder=null,this.maxDispatchNumber=16,this.pendingDispatchNumber=0,this.pendingKernels=[],this.pendingQueries=new Map,this.sessionStatus="default",this.capturedCommandList=new Map,this.capturedPendingKernels=new Map,this.sessionExternalDataMapping=new Map}get currentKernelCustomData(){if(this.currentKernelId===null)throw new Error("currentKernelCustomData(): currentKernelId is null. (should not happen)");let e=this.kernelCustomData.get(this.currentKernelId);return e||(e={},this.kernelCustomData.set(this.currentKernelId,e)),e}async initialize(e,t){this.env=e;let r=[],n={requiredLimits:{maxComputeWorkgroupStorageSize:t.limits.maxComputeWorkgroupStorageSize,maxComputeWorkgroupsPerDimension:t.limits.maxComputeWorkgroupsPerDimension,maxStorageBufferBindingSize:t.limits.maxStorageBufferBindingSize,maxBufferSize:t.limits.maxBufferSize,maxComputeInvocationsPerWorkgroup:t.limits.maxComputeInvocationsPerWorkgroup,maxComputeWorkgroupSizeX:t.limits.maxComputeWorkgroupSizeX,maxComputeWorkgroupSizeY:t.limits.maxComputeWorkgroupSizeY,maxComputeWorkgroupSizeZ:t.limits.maxComputeWorkgroupSizeZ},requiredFeatures:r},a=i=>t.features.has(i)&&r.push(i)&&!0;a("chromium-experimental-timestamp-query-inside-passes")||a("timestamp-query"),a("shader-f16"),a("subgroups"),this.device=await t.requestDevice(n),this.adapterInfo=new td(t.info||await t.requestAdapterInfo()),this.gpuDataManager=Gd(this),this.programManager=new zc(this),this.kernels=new Map,this.kernelPersistentData=new Map,this.kernelCustomData=new Map,Hn(e.logLevel,!!e.debug),this.device.onuncapturederror=i=>{i.error instanceof GPUValidationError&&console.error(`An uncaught WebGPU validation error was raised: ${i.error.message}`)},Object.defineProperty(this.env.webgpu,"device",{value:this.device,writable:!1,enumerable:!0,configurable:!1}),Object.defineProperty(this.env.webgpu,"adapter",{value:t,writable:!1,enumerable:!0,configurable:!1}),this.setQueryType()}dispose(){typeof this.querySet<"u"&&this.querySet.destroy(),this.gpuDataManager.dispose()}getCommandEncoder(){return this.commandEncoder||(this.commandEncoder=this.device.createCommandEncoder()),this.commandEncoder}getComputePassEncoder(){if(!this.computePassEncoder){let e=this.getCommandEncoder(),t={};this.queryType==="at-passes"&&(t.timestampWrites={querySet:this.querySet,beginningOfPassWriteIndex:this.pendingDispatchNumber*2,endOfPassWriteIndex:this.pendingDispatchNumber*2+1}),this.computePassEncoder=e.beginComputePass(t)}return this.computePassEncoder}endComputePass(){this.computePassEncoder&&(this.computePassEncoder.end(),this.computePassEncoder=null)}flush(){if(!this.commandEncoder)return;Ze(),this.endComputePass();let e;this.queryType!=="none"&&(this.commandEncoder.resolveQuerySet(this.querySet,0,this.pendingDispatchNumber*2,this.queryResolveBuffer,0),e=this.device.createBuffer({size:this.pendingDispatchNumber*2*8,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),this.pendingQueries.set(e,this.pendingKernels),this.pendingKernels=[],this.commandEncoder.copyBufferToBuffer(this.queryResolveBuffer,0,e,0,this.pendingDispatchNumber*2*8)),this.device.queue.submit([this.commandEncoder.finish()]),this.gpuDataManager.refreshPendingBuffers(),this.commandEncoder=null,this.pendingDispatchNumber=0,this.queryType!=="none"&&e.mapAsync(GPUMapMode.READ).then(()=>{var n;let t=new BigUint64Array(e.getMappedRange()),r=this.pendingQueries.get(e);for(let a=0;a<t.length/2;a++){let i=r[a],s=i.kernelId,u=this.kernels.get(s),d=u.kernelType,l=u.kernelName,f=i.programName,c=i.inputTensorViews,h=i.outputTensorViews,g=t[a*2],y=t[a*2+1];typeof this.queryTimeBase>"u"&&(this.queryTimeBase=g);let b=Number(g-this.queryTimeBase),x=Number(y-this.queryTimeBase);if(!Number.isSafeInteger(b)||!Number.isSafeInteger(x))throw new RangeError("incorrect timestamp range");if((n=this.env.webgpu.profiling)!=null&&n.ondata)this.env.webgpu.profiling.ondata({version:1,inputsMetadata:c.map($=>({dims:$.dims,dataType:at($.dataType)})),outputsMetadata:h.map($=>({dims:$.dims,dataType:at($.dataType)})),kernelId:s,kernelType:d,kernelName:l,programName:f,startTime:b,endTime:x});else{let $="";c.forEach((S,T)=>{$+=`input[${T}]: [${S.dims}] | ${at(S.dataType)}, `});let w="";h.forEach((S,T)=>{w+=`output[${T}]: [${S.dims}] | ${at(S.dataType)}, `}),console.log(`[profiling] kernel "${s}|${d}|${l}|${f}" ${$}${w}execution time: ${x-b} ns`)}pr("GPU",`${f}::${g}::${y}`)}e.unmap(),this.pendingQueries.delete(e)}),We()}run(e,t,r,n,a,i){Ze(e.name);let s=[];for(let w=0;w<t.length;++w){let S=t[w].data;if(S===0)continue;let T=this.gpuDataManager.get(S);if(!T)throw new Error(`no GPU data for input: ${S}`);s.push(T)}let{outputs:u,dispatchGroup:d,programUniforms:l}=e.getRunData(t),f=r.length===0?u.map((w,S)=>S):r;if(f.length!==u.length)throw new Error(`Output size ${f.length} must be equal to ${u.length}.`);let c=[],h=[];for(let w=0;w<u.length;++w){if(!Number.isInteger(f[w])||f[w]<-3||f[w]>=i)throw new Error(`Invalid output index: ${f[w]}`);if(f[w]===-3)continue;let S=f[w]===-1,T=f[w]===-2,I=S||T?a(u[w].dataType,u[w].dims):n(f[w],u[w].dataType,u[w].dims);if(c.push(I),I.data===0)continue;let E=this.gpuDataManager.get(I.data);if(!E)throw new Error(`no GPU data for output: ${I.data}`);if(S&&this.temporaryData.push(E),T){let C=this.kernelPersistentData.get(this.currentKernelId);C||(C=[],this.kernelPersistentData.set(this.currentKernelId,C)),C.push(E)}h.push(E)}if(s.length!==t.length||h.length!==c.length){if(h.length===0)return We(e.name),c;throw new Error(`Program ${e.name} has zero-sized tensor(s) in inputs or outputs. This is not supported now.`)}let g;if(l){let w=0,S=[];l.forEach(C=>{let A=typeof C.data=="number"?[C.data]:C.data;if(A.length===0)return;let O=C.type===10?2:4,W,X;C.type===10?(X=A.length>4?16:A.length>2?8:A.length*O,W=A.length>4?16:O*A.length):(X=A.length<=2?A.length*O:16,W=16),w=Math.ceil(w/X)*X,S.push(w);let G=C.type===10?8:4;w+=A.length>4?Math.ceil(A.length/G)*W:A.length*O});let T=16;w=Math.ceil(w/T)*T;let I=new ArrayBuffer(w);l.forEach((C,A)=>{let O=S[A],W=typeof C.data=="number"?[C.data]:C.data;if(C.type===6)new Int32Array(I,O,W.length).set(W);else if(C.type===12)new Uint32Array(I,O,W.length).set(W);else if(C.type===10)new Uint16Array(I,O,W.length).set(W);else if(C.type===1)new Float32Array(I,O,W.length).set(W);else throw new Error(`Unsupported uniform type: ${at(C.type)}`)});let E=this.gpuDataManager.create(w,GPUBufferUsage.COPY_DST|GPUBufferUsage.UNIFORM);this.device.queue.writeBuffer(E.buffer,0,I,0,w),this.gpuDataManager.release(E.id),g={offset:0,size:w,buffer:E.buffer}}let y=this.programManager.normalizeDispatchGroupSize(d),b=y[1]===1&&y[2]===1,x=ed(e,t,b),$=this.programManager.getArtifact(x);if($||($=this.programManager.build(e,y),this.programManager.setArtifact(x,$),ue("info",()=>`[artifact] key: ${x}, programName: ${e.name}`)),l&&$.uniformVariablesInfo){if(l.length!==$.uniformVariablesInfo.length)throw new Error(`Uniform variables count mismatch: expect ${$.uniformVariablesInfo.length}, got ${l.length} in program "${$.programInfo.name}".`);for(let w=0;w<l.length;w++){let S=l[w],T=S.type,I=typeof S.data=="number"?1:S.data.length,[E,C]=$.uniformVariablesInfo[w];if(T!==E||I!==C)throw new Error(`Uniform variable ${w} mismatch: expect type ${E} with size ${C}, got type ${T} with size ${I} in program "${$.programInfo.name}".`)}}if(ue("info",()=>`[ProgramManager] run "${e.name}" (key=${x}) with ${y[0]}x${y[1]}x${y[2]}`),this.queryType!=="none"||this.sessionStatus==="capturing"){let w={kernelId:this.currentKernelId,programName:$.programInfo.name,inputTensorViews:t,outputTensorViews:c};this.pendingKernels.push(w),this.sessionStatus==="capturing"&&this.capturedPendingKernels.get(this.currentSessionId).push(w)}return this.programManager.run($,s,h,y,g),We(e.name),c}upload(e,t){this.gpuDataManager.upload(e,t)}memcpy(e,t){this.gpuDataManager.memcpy(e,t)}async download(e,t){await this.gpuDataManager.download(e,t)}alloc(e){return this.gpuDataManager.create(e).id}free(e){return this.gpuDataManager.release(e)}createKernel(e,t,r,n){let a=Cc.get(e);if(!a)throw new Error(`kernel not implemented: ${e}`);let i={kernelType:e,kernelName:n,kernelEntry:a[0],attributes:[a[1],r]};this.kernels.set(t,i)}releaseKernel(e){let t=this.kernelPersistentData.get(e);if(t){for(let r of t)this.gpuDataManager.release(r.id);this.kernelPersistentData.delete(e)}this.kernelCustomData.delete(e),this.kernels.delete(e)}computeKernel(e,t,r){let n=this.kernels.get(e);if(!n)throw new Error(`kernel not created: ${e}`);let a=n.kernelType,i=n.kernelName,s=n.kernelEntry,u=n.attributes;if(this.currentKernelId!==null)throw new Error(`kernel "[${a}] ${i}" is not allowed to be called recursively`);this.currentKernelId=e,u[0]&&(u[1]=u[0](u[1]),u[0]=void 0),ue("info",()=>`[WebGPU] Start to run kernel "[${a}] ${i}"...`);let d=this.env.debug;this.temporaryData=[];try{return d&&this.device.pushErrorScope("validation"),s(t,u[1]),0}catch(l){return r.push(Promise.resolve(`[WebGPU] Kernel "[${a}] ${i}" failed. ${l}`)),1}finally{d&&r.push(this.device.popErrorScope().then(l=>l?`GPU validation error for kernel "[${a}] ${i}": ${l.message}`:null));for(let l of this.temporaryData)this.gpuDataManager.release(l.id);this.temporaryData=[],this.currentKernelId=null}}registerBuffer(e,t,r,n){let a=this.sessionExternalDataMapping.get(e);a||(a=new Map,this.sessionExternalDataMapping.set(e,a));let i=a.get(t),s=this.gpuDataManager.registerExternalBuffer(r,n,i);return a.set(t,[s,r]),s}unregisterBuffers(e){let t=this.sessionExternalDataMapping.get(e);t&&(t.forEach(r=>this.gpuDataManager.unregisterExternalBuffer(r[0])),this.sessionExternalDataMapping.delete(e))}getBuffer(e){let t=this.gpuDataManager.get(e);if(!t)throw new Error(`no GPU data for buffer: ${e}`);return t.buffer}createDownloader(e,t,r){return async()=>{let n=await vn(this,e,t);return Fn(n.buffer,r)}}writeTimestamp(e){this.queryType==="inside-passes"&&this.computePassEncoder.writeTimestamp(this.querySet,e)}setQueryType(){var e;this.queryType="none",(((e=this.env.webgpu.profiling)==null?void 0:e.mode)==="default"||(typeof this.env.trace>"u"?this.env.wasm.trace:this.env.trace))&&(this.device.features.has("chromium-experimental-timestamp-query-inside-passes")?this.queryType="inside-passes":this.device.features.has("timestamp-query")&&(this.queryType="at-passes"),this.queryType!=="none"&&typeof this.querySet>"u"&&(this.querySet=this.device.createQuerySet({type:"timestamp",count:this.maxDispatchNumber*2}),this.queryResolveBuffer=this.device.createBuffer({size:this.maxDispatchNumber*2*8,usage:GPUBufferUsage.COPY_SRC|GPUBufferUsage.QUERY_RESOLVE})))}captureBegin(){ue("info","captureBegin"),this.capturedCommandList.get(this.currentSessionId)||this.capturedCommandList.set(this.currentSessionId,[]),this.capturedPendingKernels.get(this.currentSessionId)||this.capturedPendingKernels.set(this.currentSessionId,[]),this.flush(),this.sessionStatus="capturing"}captureEnd(){ue("info","captureEnd"),this.flush(),this.sessionStatus="default"}replay(){ue("info","replay"),this.sessionStatus="replaying";let e=this.capturedCommandList.get(this.currentSessionId),t=this.capturedPendingKernels.get(this.currentSessionId),r=e.length;this.pendingKernels=[];for(let n=0;n<r;n++){let a=this.getComputePassEncoder(),i=e[n];this.writeTimestamp(this.pendingDispatchNumber*2),a.setPipeline(i.computePipeline),a.setBindGroup(0,i.bindGroup),a.dispatchWorkgroups(...i.dispatchGroup),this.writeTimestamp(this.pendingDispatchNumber*2+1),this.pendingDispatchNumber++,this.queryType!=="none"&&this.pendingKernels.push(t[n]),(this.pendingDispatchNumber>=this.maxDispatchNumber||this.queryType==="at-passes")&&this.endComputePass(),this.pendingDispatchNumber>=this.maxDispatchNumber&&this.flush()}this.flush(),this.sessionStatus="default"}onCreateSession(){this.gpuDataManager.onCreateSession()}onReleaseSession(e){this.unregisterBuffers(e),this.capturedCommandList.has(e)&&this.capturedCommandList.delete(e),this.capturedPendingKernels.has(e)&&this.capturedPendingKernels.delete(e),this.gpuDataManager.onReleaseSession(e)}onRunStart(e){this.currentSessionId=e,this.setQueryType()}}}),Bc={};Vt(Bc,{init:()=>Rc});var Dr,rd,Rc,Fg=U(()=>{J(),st(),re(),tg(),Dr=class Dc{constructor(t,r,n,a){this.module=t,this.dataType=r,this.data=n,this.dims=a}getFloat32Array(){if(this.dataType!==1)throw new Error("Invalid data type");let t=z.size(this.dims);return t===0?new Float32Array:new Float32Array(this.module.HEAP8.buffer,this.data,t)}getBigInt64Array(){if(this.dataType!==7)throw new Error("Invalid data type");let t=z.size(this.dims);return t===0?new BigInt64Array:new BigInt64Array(this.module.HEAP8.buffer,this.data,t)}getInt32Array(){if(this.dataType!==6)throw new Error("Invalid data type");let t=z.size(this.dims);return t===0?new Int32Array:new Int32Array(this.module.HEAP8.buffer,this.data,t)}getUint16Array(){if(this.dataType!==10&&this.dataType!==4)throw new Error("Invalid data type");let t=z.size(this.dims);return t===0?new Uint16Array:new Uint16Array(this.module.HEAP8.buffer,this.data,t)}reshape(t){if(z.size(t)!==z.size(this.dims))throw new Error("Invalid new shape");return new Dc(this.module,this.dataType,this.data,t)}},rd=class{constructor(e,t,r){this.module=e,this.backend=t,this.customDataOffset=0,this.customDataSize=0,this.adapterInfo=t.adapterInfo;let n=e.PTR_SIZE,a=r/e.PTR_SIZE,i=n===4?"i32":"i64";this.opKernelContext=Number(e.getValue(n*a++,i));let s=Number(e.getValue(n*a++,i));this.outputCount=Number(e.getValue(n*a++,i)),this.customDataOffset=Number(e.getValue(n*a++,"*")),this.customDataSize=Number(e.getValue(n*a++,i));let u=[];for(let d=0;d<s;d++){let l=Number(e.getValue(n*a++,i)),f=Number(e.getValue(n*a++,"*")),c=Number(e.getValue(n*a++,i)),h=[];for(let g=0;g<c;g++)h.push(Number(e.getValue(n*a++,i)));u.push(new Dr(e,l,f,h))}this.inputs=u}get kernelCustomData(){return this.backend.currentKernelCustomData}get customDataBuffer(){return this.module.HEAPU8.subarray(this.customDataOffset,this.customDataOffset+this.customDataSize)}compute(e,t){var s;let r=((s=t==null?void 0:t.inputs)==null?void 0:s.map(u=>typeof u=="number"?this.inputs[u]:u))??this.inputs,n=(t==null?void 0:t.outputs)??[],a=(u,d,l)=>new Dr(this.module,d,this.output(u,l),l),i=(u,d)=>{let l=kt(u,d);if(!l)throw new Error(`Unsupported data type: ${u}`);let f=l>0?this.backend.gpuDataManager.create(l).id:0;return new Dr(this.module,u,f,d)};return this.backend.run(e,r,n,a,i,this.outputCount)}output(e,t){let r=this.module.stackSave();try{let n=this.module.PTR_SIZE,a=n===4?"i32":"i64",i=this.module.stackAlloc((1+t.length)*n);this.module.setValue(i,t.length,a);for(let s=0;s<t.length;s++)this.module.setValue(i+n*(s+1),t[s],a);return this.module._JsepOutput(this.opKernelContext,e,i)}catch(n){throw new Error(`Failed to generate kernel's output[${e}] with dims [${t}]. If you are running with pre-allocated output, please make sure the output type/dims are correct. Error: ${n}`)}finally{this.module.stackRestore(r)}}},Rc=async(e,t,r,n)=>{let a=t.jsepInit;if(!a)throw new Error("Failed to initialize JSEP. The WebAssembly module is not built with JSEP support.");if(e==="webgpu"){let i=(Hg(),dr(Ac)).WebGpuBackend,s=new i;await s.initialize(r,n),a("webgpu",[s,u=>s.alloc(Number(u)),u=>s.free(u),(u,d,l,f=!1)=>{if(f)ue("verbose",()=>`[WebGPU] jsepCopyGpuToGpu: src=${Number(u)}, dst=${Number(d)}, size=${Number(l)}`),s.memcpy(Number(u),Number(d));else{ue("verbose",()=>`[WebGPU] jsepCopyCpuToGpu: dataOffset=${Number(u)}, gpuDataId=${Number(d)}, size=${Number(l)}`);let c=t.HEAPU8.subarray(Number(u>>>0),Number(u>>>0)+Number(l));s.upload(Number(d),c)}},async(u,d,l)=>{ue("verbose",()=>`[WebGPU] jsepCopyGpuToCpu: gpuDataId=${u}, dataOffset=${d}, size=${l}`),await s.download(Number(u),()=>t.HEAPU8.subarray(Number(d)>>>0,Number(d+l)>>>0))},(u,d,l)=>s.createKernel(u,Number(d),l,t.UTF8ToString(t._JsepGetNodeName(Number(d)))),u=>s.releaseKernel(u),(u,d,l,f)=>{ue("verbose",()=>`[WebGPU] jsepRun: sessionHandle=${l}, kernel=${u}, contextDataOffset=${d}`);let c=new rd(t,s,Number(d));return s.computeKernel(Number(u),c,f)},()=>s.captureBegin(),()=>s.captureEnd(),()=>s.replay()])}else{let i=new jd(r);a("webnn",[i,()=>i.reserveTensorId(),s=>i.releaseTensorId(s),async(s,u,d,l,f)=>i.ensureTensor(s,u,d,l,f),(s,u)=>{i.uploadTensor(s,u)},async(s,u)=>i.downloadTensor(s,u)])}}}),id,na,aa,ht,nd,cn,Kr,sa,oa,hn,ua,la,da,Nc=U(()=>{Ym(),Jm(),J(),Ot(),Ln(),Pd(),id=(e,t)=>{ye()._OrtInit(e,t)!==0&&he("Can't initialize onnxruntime.")},na=async e=>{id(e.wasm.numThreads,Vr(e.logLevel))},aa=async(e,t)=>{var r,n;(n=(r=ye()).asyncInit)==null||n.call(r);{let a=(Fg(),dr(Bc)).init;if(t==="webgpu"){if(typeof navigator>"u"||!navigator.gpu)throw new Error("WebGPU is not supported in current environment");let i=e.webgpu.adapter;if(i){if(typeof i.limits!="object"||typeof i.features!="object"||typeof i.requestDevice!="function")throw new Error("Invalid GPU adapter set in `env.webgpu.adapter`. It must be a GPUAdapter object.")}else{let s=e.webgpu.powerPreference;if(s!==void 0&&s!=="low-power"&&s!=="high-performance")throw new Error(`Invalid powerPreference setting: "${s}"`);let u=e.webgpu.forceFallbackAdapter;if(u!==void 0&&typeof u!="boolean")throw new Error(`Invalid forceFallbackAdapter setting: "${u}"`);if(i=await navigator.gpu.requestAdapter({powerPreference:s,forceFallbackAdapter:u}),!i)throw new Error('Failed to get GPU adapter. You may need to enable flag "--enable-unsafe-webgpu" if you are using Chrome.')}await a("webgpu",ye(),e,i)}if(t==="webnn"){if(typeof navigator>"u"||!navigator.ml)throw new Error("WebNN is not supported in current environment");await a("webnn",ye(),e)}}},ht=new Map,nd=e=>{let t=ye(),r=t.stackSave();try{let n=t.PTR_SIZE,a=t.stackAlloc(2*n);t._OrtGetInputOutputCount(e,a,a+n)!==0&&he("Can't get session input/output count.");let i=n===4?"i32":"i64";return[Number(t.getValue(a,i)),Number(t.getValue(a+n,i))]}finally{t.stackRestore(r)}},cn=(e,t)=>{let r=ye(),n=r.stackSave(),a=0;try{let i=r.PTR_SIZE,s=r.stackAlloc(2*i);r._OrtGetInputOutputMetadata(e,t,s,s+i)!==0&&he("Can't get session input/output metadata.");let u=Number(r.getValue(s,"*"));a=Number(r.getValue(s+i,"*"));let d=r.HEAP32[a/4];if(d===0)return[u,0];let l=r.HEAPU32[a/4+1],f=[];for(let c=0;c<l;c++){let h=Number(r.getValue(a+8+c*i,"*"));f.push(h!==0?r.UTF8ToString(h):Number(r.getValue(a+8+(c+l)*i,"*")))}return[u,d,f]}finally{r.stackRestore(n),a!==0&&r._OrtFree(a)}},Kr=e=>{let t=ye(),r=t._malloc(e.byteLength);if(r===0)throw new Error(`Can't create a session. failed to allocate a buffer of size ${e.byteLength}.`);return t.HEAPU8.set(e,r),[r,e.byteLength]},sa=async(e,t)=>{var c,h,g,y;let r,n,a=ye();Array.isArray(e)?[r,n]=e:e.buffer===a.HEAPU8.buffer?[r,n]=[e.byteOffset,e.byteLength]:[r,n]=Kr(e);let i=0,s=0,u=0,d=[],l=[],f=[];try{if([s,d]=await Md(t),(t==null?void 0:t.externalData)&&a.mountExternalData){let A=[];for(let O of t.externalData){let W=typeof O=="string"?O:O.path;A.push(Gn(typeof O=="string"?O:O.data).then(X=>{a.mountExternalData(W,X)}))}await Promise.all(A)}for(let A of(t==null?void 0:t.executionProviders)??[])if((typeof A=="string"?A:A.name)==="webnn"){if(a.shouldTransferToMLTensor=!1,typeof A!="string"){let O=A,W=O==null?void 0:O.context,X=O==null?void 0:O.gpuDevice,G=O==null?void 0:O.deviceType,Q=O==null?void 0:O.powerPreference;W?a.currentContext=W:X?a.currentContext=await a.webnnCreateMLContext(X):a.currentContext=await a.webnnCreateMLContext({deviceType:G,powerPreference:Q})}else a.currentContext=await a.webnnCreateMLContext();break}i=await a._OrtCreateSession(r,n,s),(c=a.webgpuOnCreateSession)==null||c.call(a,i),i===0&&he("Can't create a session."),(h=a.jsepOnCreateSession)==null||h.call(a),a.currentContext&&(a.webnnRegisterMLContext(i,a.currentContext),a.currentContext=void 0,a.shouldTransferToMLTensor=!0);let[b,x]=nd(i),$=!!(t!=null&&t.enableGraphCapture),w=[],S=[],T=[],I=[],E=[];for(let A=0;A<b;A++){let[O,W,X]=cn(i,A);O===0&&he("Can't get an input name."),l.push(O);let G=a.UTF8ToString(O);w.push(G),T.push(W===0?{name:G,isTensor:!1}:{name:G,isTensor:!0,type:at(W),shape:X})}for(let A=0;A<x;A++){let[O,W,X]=cn(i,A+b);O===0&&he("Can't get an output name."),f.push(O);let G=a.UTF8ToString(O);S.push(G),I.push(W===0?{name:G,isTensor:!1}:{name:G,isTensor:!0,type:at(W),shape:X});{if($&&(t==null?void 0:t.preferredOutputLocation)===void 0){E.push("gpu-buffer");continue}let Q=typeof(t==null?void 0:t.preferredOutputLocation)=="string"?t.preferredOutputLocation:((g=t==null?void 0:t.preferredOutputLocation)==null?void 0:g[G])??"cpu";if(Q!=="cpu"&&Q!=="cpu-pinned"&&Q!=="gpu-buffer"&&Q!=="ml-tensor")throw new Error(`Not supported preferred output location: ${Q}.`);if($&&Q!=="gpu-buffer")throw new Error(`Not supported preferred output location: ${Q}. Only 'gpu-buffer' location is supported when enableGraphCapture is true.`);E.push(Q)}}let C=null;return E.some(A=>A==="gpu-buffer"||A==="ml-tensor")&&(u=a._OrtCreateBinding(i),u===0&&he("Can't create IO binding."),C={handle:u,outputPreferredLocations:E,outputPreferredLocationsEncoded:E.map(A=>wn(A))}),ht.set(i,[i,l,f,C,$,!1]),[i,w,S,T,I]}catch(b){throw l.forEach(x=>a._OrtFree(x)),f.forEach(x=>a._OrtFree(x)),u!==0&&a._OrtReleaseBinding(u)!==0&&he("Can't release IO binding."),i!==0&&a._OrtReleaseSession(i)!==0&&he("Can't release session."),b}finally{a._free(r),s!==0&&a._OrtReleaseSessionOptions(s)!==0&&he("Can't release session options."),d.forEach(b=>a._free(b)),(y=a.unmountExternalData)==null||y.call(a)}},oa=e=>{var d,l,f;let t=ye(),r=ht.get(e);if(!r)throw new Error(`cannot release session. invalid session id: ${e}`);let[n,a,i,s,u]=r;s&&(u&&t._OrtClearBoundOutputs(s.handle)!==0&&he("Can't clear bound outputs."),t._OrtReleaseBinding(s.handle)!==0&&he("Can't release IO binding.")),(d=t.jsepOnReleaseSession)==null||d.call(t,e),(l=t.webnnOnReleaseSession)==null||l.call(t,e),(f=t.webgpuOnReleaseSession)==null||f.call(t,e),a.forEach(c=>t._OrtFree(c)),i.forEach(c=>t._OrtFree(c)),t._OrtReleaseSession(n)!==0&&he("Can't release session."),ht.delete(e)},hn=async(e,t,r,n,a,i,s=!1)=>{if(!e){t.push(0);return}let u=ye(),d=u.PTR_SIZE,l=e[0],f=e[1],c=e[3],h=c,g,y;if(l==="string"&&(c==="gpu-buffer"||c==="ml-tensor"))throw new Error("String tensor is not supported on GPU.");if(s&&c!=="gpu-buffer")throw new Error(`External buffer must be provided for input/output index ${i} when enableGraphCapture is true.`);if(c==="gpu-buffer"){let $=e[2].gpuBuffer;y=kt(Pt(l),f);{let w=u.jsepRegisterBuffer;if(!w)throw new Error('Tensor location "gpu-buffer" is not supported without using WebGPU.');g=w(n,i,$,y)}}else if(c==="ml-tensor"){let $=e[2].mlTensor;y=kt(Pt(l),f);let w=u.webnnRegisterMLTensor;if(!w)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');g=w(n,$,Pt(l),f)}else{let $=e[2];if(Array.isArray($)){y=d*$.length,g=u._malloc(y),r.push(g);for(let w=0;w<$.length;w++){if(typeof $[w]!="string")throw new TypeError(`tensor data at index ${w} is not a string`);u.setValue(g+w*d,He($[w],r),"*")}}else{let w=u.webnnIsGraphInput;if(l!=="string"&&w){let S=u.UTF8ToString(a);if(w(n,S)){let T=Pt(l);y=kt(T,f),h="ml-tensor";let I=u.webnnCreateTemporaryTensor,E=u.webnnUploadTensor;if(!I||!E)throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');let C=await I(n,T,f);E(C,new Uint8Array($.buffer,$.byteOffset,$.byteLength)),g=C}else y=$.byteLength,g=u._malloc(y),r.push(g),u.HEAPU8.set(new Uint8Array($.buffer,$.byteOffset,y),g)}else y=$.byteLength,g=u._malloc(y),r.push(g),u.HEAPU8.set(new Uint8Array($.buffer,$.byteOffset,y),g)}}let b=u.stackSave(),x=u.stackAlloc(4*f.length);try{f.forEach((w,S)=>u.setValue(x+S*d,w,d===4?"i32":"i64"));let $=u._OrtCreateTensor(Pt(l),g,y,x,f.length,wn(h));$===0&&he(`Can't create tensor for input/output. session=${n}, index=${i}.`),t.push($)}finally{u.stackRestore(b)}},ua=async(e,t,r,n,a,i)=>{var X,G,Q,oe;let s=ye(),u=s.PTR_SIZE,d=ht.get(e);if(!d)throw new Error(`cannot run inference. invalid session id: ${e}`);let l=d[0],f=d[1],c=d[2],h=d[3],g=d[4],y=d[5],b=t.length,x=n.length,$=0,w=[],S=[],T=[],I=[],E=s.stackSave(),C=s.stackAlloc(b*u),A=s.stackAlloc(b*u),O=s.stackAlloc(x*u),W=s.stackAlloc(x*u);try{[$,w]=Nd(i);for(let L=0;L<b;L++)await hn(r[L],S,I,e,f[t[L]],t[L],g);for(let L=0;L<x;L++)await hn(a[L],T,I,e,c[n[L]],b+n[L],g);for(let L=0;L<b;L++)s.setValue(C+L*u,S[L],"*"),s.setValue(A+L*u,f[t[L]],"*");for(let L=0;L<x;L++)s.setValue(O+L*u,T[L],"*"),s.setValue(W+L*u,c[n[L]],"*");if(h&&!y){let{handle:L,outputPreferredLocations:le,outputPreferredLocationsEncoded:ee}=h;if(f.length!==b)throw new Error(`input count from feeds (${b}) is expected to be always equal to model's input count (${f.length}).`);for(let ne=0;ne<b;ne++){let D=t[ne];await s._OrtBindInput(L,f[D],S[ne])!==0&&he(`Can't bind input[${ne}] for session=${e}.`)}for(let ne=0;ne<x;ne++){let D=n[ne];(X=a[ne])!=null&&X[3]?s._OrtBindOutput(L,c[D],T[ne],0)!==0&&he(`Can't bind pre-allocated output[${ne}] for session=${e}.`):s._OrtBindOutput(L,c[D],0,ee[D])!==0&&he(`Can't bind output[${ne}] to ${le[ne]} for session=${e}.`)}ht.set(e,[l,f,c,h,g,!0])}(G=s.jsepOnRunStart)==null||G.call(s,l),(Q=s.webnnOnRunStart)==null||Q.call(s,l);let te;h?te=await s._OrtRunWithBinding(l,h.handle,x,O,$):te=await s._OrtRun(l,A,C,b,W,x,O,$),te!==0&&he("failed to call OrtRun().");let V=[];for(let L=0;L<x;L++){let le=Number(s.getValue(O+L*u,"*"));if(le===T[L]){V.push(a[L]);continue}let ee=s.stackSave(),ne=s.stackAlloc(4*u),D=!1,P,j=0;try{s._OrtGetTensorData(le,ne,ne+u,ne+2*u,ne+3*u)!==0&&he(`Can't access output tensor data on index ${L}.`);let se=u===4?"i32":"i64",Se=Number(s.getValue(ne,se));j=s.getValue(ne+u,"*");let N=s.getValue(ne+u*2,"*"),me=Number(s.getValue(ne+u*3,se)),Ne=[];for(let xe=0;xe<me;xe++)Ne.push(Number(s.getValue(N+xe*u,se)));s._OrtFree(N)!==0&&he("Can't free memory for tensor dims.");let ze=Ne.reduce((xe,ce)=>xe*ce,1);P=at(Se);let _t=h==null?void 0:h.outputPreferredLocations[n[L]];if(P==="string"){if(_t==="gpu-buffer"||_t==="ml-tensor")throw new Error("String tensor is not supported on GPU.");let xe=[];for(let ce=0;ce<ze;ce++){let Xe=s.getValue(j+ce*u,"*"),jt=s.getValue(j+(ce+1)*u,"*"),bt=ce===ze-1?void 0:jt-Xe;xe.push(s.UTF8ToString(Xe,bt))}V.push([P,Ne,xe,"cpu"])}else if(_t==="gpu-buffer"&&ze>0){let xe=s.jsepGetBuffer;if(!xe)throw new Error('preferredLocation "gpu-buffer" is not supported without using WebGPU.');let ce=xe(j),Xe=kt(Se,ze);if(Xe===void 0||!Vn(P))throw new Error(`Unsupported data type: ${P}`);D=!0,V.push([P,Ne,{gpuBuffer:ce,download:s.jsepCreateDownloader(ce,Xe,P),dispose:()=>{s._OrtReleaseTensor(le)!==0&&he("Can't release tensor.")}},"gpu-buffer"])}else if(_t==="ml-tensor"&&ze>0){let xe=s.webnnEnsureTensor,ce=s.webnnIsInt64Supported;if(!xe||!ce)throw new Error('preferredLocation "ml-tensor" is not supported without using WebNN.');if(kt(Se,ze)===void 0||!jn(P))throw new Error(`Unsupported data type: ${P}`);if(P==="int64"&&!ce(e))throw new Error('preferredLocation "ml-tensor" for int64 output is not supported by current WebNN Context.');let Xe=await xe(e,j,Se,Ne,!1);D=!0,V.push([P,Ne,{mlTensor:Xe,download:s.webnnCreateMLTensorDownloader(j,P),dispose:()=>{s.webnnReleaseTensorId(j),s._OrtReleaseTensor(le)}},"ml-tensor"])}else{let xe=qn(P),ce=new xe(ze);new Uint8Array(ce.buffer,ce.byteOffset,ce.byteLength).set(s.HEAPU8.subarray(j,j+ce.byteLength)),V.push([P,Ne,ce,"cpu"])}}finally{s.stackRestore(ee),P==="string"&&j&&s._free(j),D||s._OrtReleaseTensor(le),(oe=s.webnnOnRunEnd)==null||oe.call(s,l)}}return h&&!g&&(s._OrtClearBoundOutputs(h.handle)!==0&&he("Can't clear bound outputs."),ht.set(e,[l,f,c,h,g,!1])),V}finally{s.stackRestore(E),S.forEach(te=>s._OrtReleaseTensor(te)),T.forEach(te=>s._OrtReleaseTensor(te)),I.forEach(te=>s._free(te)),$!==0&&s._OrtReleaseRunOptions($),w.forEach(te=>s._free(te))}},la=e=>{let t=ye(),r=ht.get(e);if(!r)throw new Error("invalid session id");let n=r[0],a=t._OrtEndProfiling(n);a===0&&he("Can't get an profile file name."),t._OrtFree(a)},da=e=>{let t=[];for(let r of e){let n=r[2];!Array.isArray(n)&&"buffer"in n&&t.push(n.buffer)}return t}}),mt,Ae,Nt,ir,nr,Nr,mn,Mr,xt,Tt,ad,Mc,Pc,Uc,Wc,Lc,qc,Vc,jc=U(()=>{Qe(),Nc(),Ot(),Un(),mt=()=>!!_e.wasm.proxy&&typeof document<"u",Nt=!1,ir=!1,nr=!1,Mr=new Map,xt=(e,t)=>{let r=Mr.get(e);r?r.push(t):Mr.set(e,[t])},Tt=()=>{if(Nt||!ir||nr||!Ae)throw new Error("worker not ready")},ad=e=>{switch(e.data.type){case"init-wasm":Nt=!1,e.data.err?(nr=!0,mn[1](e.data.err)):(ir=!0,mn[0]()),Nr&&(URL.revokeObjectURL(Nr),Nr=void 0);break;case"init-ep":case"copy-from":case"create":case"release":case"run":case"end-profiling":{let t=Mr.get(e.data.type);e.data.err?t.shift()[1](e.data.err):t.shift()[0](e.data.out);break}}},Mc=async()=>{if(!ir){if(Nt)throw new Error("multiple calls to 'initWasm()' detected.");if(nr)throw new Error("previous call to 'initWasm()' failed.");if(Nt=!0,mt())return new Promise((e,t)=>{Ae==null||Ae.terminate(),Rd().then(([r,n])=>{try{Ae=n,Ae.onerror=i=>t(i),Ae.onmessage=ad,mn=[e,t];let a={type:"init-wasm",in:_e};!a.in.wasm.wasmPaths&&(r||bn)&&(a.in.wasm.wasmPaths={wasm:new URL("/image-shot-video-generator/preview/assets/ort-wasm-simd-threaded.jsep-B0T3yYHD.wasm",import.meta.url).href}),Ae.postMessage(a),Nr=r}catch(a){t(a)}},t)});try{await Wn(_e.wasm),await na(_e),ir=!0}catch(e){throw nr=!0,e}finally{Nt=!1}}},Pc=async e=>{if(mt())return Tt(),new Promise((t,r)=>{xt("init-ep",[t,r]);let n={type:"init-ep",in:{epName:e,env:_e}};Ae.postMessage(n)});await aa(_e,e)},Uc=async e=>mt()?(Tt(),new Promise((t,r)=>{xt("copy-from",[t,r]);let n={type:"copy-from",in:{buffer:e}};Ae.postMessage(n,[e.buffer])})):Kr(e),Wc=async(e,t)=>{if(mt()){if(t!=null&&t.preferredOutputLocation)throw new Error('session option "preferredOutputLocation" is not supported for proxy.');return Tt(),new Promise((r,n)=>{xt("create",[r,n]);let a={type:"create",in:{model:e,options:{...t}}},i=[];e instanceof Uint8Array&&i.push(e.buffer),Ae.postMessage(a,i)})}else return sa(e,t)},Lc=async e=>{if(mt())return Tt(),new Promise((t,r)=>{xt("release",[t,r]);let n={type:"release",in:e};Ae.postMessage(n)});oa(e)},qc=async(e,t,r,n,a,i)=>{if(mt()){if(r.some(s=>s[3]!=="cpu"))throw new Error("input tensor on GPU is not supported for proxy.");if(a.some(s=>s))throw new Error("pre-allocated output tensor is not supported for proxy.");return Tt(),new Promise((s,u)=>{xt("run",[s,u]);let d=r,l={type:"run",in:{sessionId:e,inputIndices:t,inputs:d,outputIndices:n,options:i}};Ae.postMessage(l,da(d))})}else return ua(e,t,r,n,a,i)},Vc=async e=>{if(mt())return Tt(),new Promise((t,r)=>{xt("end-profiling",[t,r]);let n={type:"end-profiling",in:e};Ae.postMessage(n)});la(e)}}),gn,sd,Gc,Kg=U(()=>{Qe(),jc(),J(),Pn(),Pd(),gn=(e,t)=>{switch(e.location){case"cpu":return[e.type,e.dims,e.data,"cpu"];case"gpu-buffer":return[e.type,e.dims,{gpuBuffer:e.gpuBuffer},"gpu-buffer"];case"ml-tensor":return[e.type,e.dims,{mlTensor:e.mlTensor},"ml-tensor"];default:throw new Error(`invalid data location: ${e.location} for ${t()}`)}},sd=e=>{switch(e[3]){case"cpu":return new Fe(e[0],e[2],e[1]);case"gpu-buffer":{let t=e[0];if(!Vn(t))throw new Error(`not supported data type: ${t} for deserializing GPU tensor`);let{gpuBuffer:r,download:n,dispose:a}=e[2];return Fe.fromGpuBuffer(r,{dataType:t,dims:e[1],download:n,dispose:a})}case"ml-tensor":{let t=e[0];if(!jn(t))throw new Error(`not supported data type: ${t} for deserializing MLTensor tensor`);let{mlTensor:r,download:n,dispose:a}=e[2];return Fe.fromMLTensor(r,{dataType:t,dims:e[1],download:n,dispose:a})}default:throw new Error(`invalid data location: ${e[3]}`)}},Gc=class{async fetchModelAndCopyToWasmMemory(e){return Uc(await Gn(e))}async loadModel(e,t){Ze();let r;typeof e=="string"?r=await this.fetchModelAndCopyToWasmMemory(e):r=e,[this.sessionId,this.inputNames,this.outputNames,this.inputMetadata,this.outputMetadata]=await Wc(r,t),We()}async dispose(){return Lc(this.sessionId)}async run(e,t,r){Ze();let n=[],a=[];Object.entries(e).forEach(c=>{let h=c[0],g=c[1],y=this.inputNames.indexOf(h);if(y===-1)throw new Error(`invalid input '${h}'`);n.push(g),a.push(y)});let i=[],s=[];Object.entries(t).forEach(c=>{let h=c[0],g=c[1],y=this.outputNames.indexOf(h);if(y===-1)throw new Error(`invalid output '${h}'`);i.push(g),s.push(y)});let u=n.map((c,h)=>gn(c,()=>`input "${this.inputNames[a[h]]}"`)),d=i.map((c,h)=>c?gn(c,()=>`output "${this.outputNames[s[h]]}"`):null),l=await qc(this.sessionId,a,u,s,d,r),f={};for(let c=0;c<l.length;c++)f[this.outputNames[s[c]]]=i[c]??sd(l[c]);return We(),f}startProfiling(){}endProfiling(){Vc(this.sessionId)}}}),Hc={};Vt(Hc,{OnnxruntimeWebAssemblyBackend:()=>Rn,initializeFlags:()=>Bn,wasmBackend:()=>Fc});var Bn,Rn,Fc,Zg=U(()=>{Qe(),jc(),Kg(),Bn=()=>{(typeof _e.wasm.initTimeout!="number"||_e.wasm.initTimeout<0)&&(_e.wasm.initTimeout=0);let e=_e.wasm.simd;if(typeof e!="boolean"&&e!==void 0&&e!=="fixed"&&e!=="relaxed"&&(console.warn(`Property "env.wasm.simd" is set to unknown value "${e}". Reset it to \`false\` and ignore SIMD feature checking.`),_e.wasm.simd=!1),typeof _e.wasm.proxy!="boolean"&&(_e.wasm.proxy=!1),typeof _e.wasm.trace!="boolean"&&(_e.wasm.trace=!1),typeof _e.wasm.numThreads!="number"||!Number.isInteger(_e.wasm.numThreads)||_e.wasm.numThreads<=0)if(typeof self<"u"&&!self.crossOriginIsolated)_e.wasm.numThreads=1;else{let t=typeof navigator>"u"?Dm("node:os").cpus().length:navigator.hardwareConcurrency;_e.wasm.numThreads=Math.min(4,Math.ceil((t||1)/2))}},Rn=class{async init(e){Bn(),await Mc(),await Pc(e)}async createInferenceSessionHandler(e,t){let r=new Gc;return await r.loadModel(e,t),r}},Fc=new Rn});Qe();Qe();Qe();var Qg="1.22.0-dev.20250409-89f8206ba4",Xg=Ed;{let e=(Zg(),dr(Hc)).wasmBackend;Et("webgpu",e,5),Et("webnn",e,5),Et("cpu",e,10),Et("wasm",e,10)}Object.defineProperty(_e.versions,"web",{value:Qg,enumerable:!0});/**
* @license
* Copyright 2021 Google LLC. All Rights Reserved.
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
* =============================================================================
*//**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 *//**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */const ty=Object.freeze(Object.defineProperty({__proto__:null,get InferenceSession(){return Mn},get TRACE(){return pr},get TRACE_FUNC_BEGIN(){return Ze},get TRACE_FUNC_END(){return We},get Tensor(){return Fe},default:Xg,get env(){return _e},get registerBackend(){return Et}},Symbol.toStringTag,{value:"Module"}));export{ey as _,ty as a};
