'use strict';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const story = document.querySelector('.story');
const stage = document.querySelector('.story-stage');
const about = document.querySelector('#about-copy');
const opening = document.querySelector('#opening-copy');
const header = document.querySelector('.site-header');
const fallback = document.querySelector('.scene-fallback');
const sceneButtons = [...document.querySelectorAll('.scene-nav button')];
const sceneNames = ['opening', 'about', 'tools'];
let sceneValue = 0;
let currentScene = -1;
let waterDraw = null;
let storyVisible = true;

const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const smooth = (a, b, value) => { const x = clamp((value - a) / (b - a)); return x * x * (3 - 2 * x); };
function readStory() {
  const travel = story.offsetHeight - stage.offsetHeight;
  const progress = clamp(-story.getBoundingClientRect().top / Math.max(travel, 1));
  sceneValue = smooth(.04, .36, progress) + smooth(.53, .82, progress);
  const aboutAlpha = smooth(.56, .98, sceneValue) * (1 - smooth(1.05, 1.5, sceneValue));
  const openingAlpha = 1 - smooth(0, .55, sceneValue);
  about.style.opacity = aboutAlpha;
  about.style.visibility = aboutAlpha > .01 ? 'visible' : 'hidden';
  about.inert = aboutAlpha < .8;
  about.style.translate = `0 ${(1 - aboutAlpha) * 18}px`;
  opening.style.opacity = openingAlpha;
  opening.style.visibility = openingAlpha > .01 ? 'visible' : 'hidden';
  stage.style.setProperty('--about-alpha', aboutAlpha);
  document.querySelector('.portrait-assist').style.opacity = aboutAlpha;
  header.classList.toggle('scrolled', window.scrollY > story.offsetHeight - stage.offsetHeight * .4);
  const nextScene = Math.round(sceneValue);
  if (nextScene !== currentScene) {
    currentScene = nextScene;
    stage.dataset.scene = String(currentScene);
    sceneButtons.forEach((button, i) => { button.classList.toggle('active', i === currentScene); if(i === currentScene) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
    fallback.style.backgroundImage = `url("assets/${sceneNames[currentScene]}.webp")`;
    document.querySelector('#scroll-label').innerHTML = currentScene === 2 ? '探索作品 <small>DISCOVER THE WORK</small>' : '向下探索 <small>SCROLL TO EXPLORE</small>';
  }
  if (waterDraw) waterDraw();
}
function goToScene(index) {
  const travel = story.offsetHeight - stage.offsetHeight;
  const targets = [0, .44, .9];
  scrollTo({ top: story.offsetTop + travel * targets[index], behavior: reducedMotion ? 'instant' : 'smooth' });
}
document.querySelectorAll('[data-scene]').forEach(button => button.addEventListener('click', () => goToScene(Number(button.dataset.scene))));
document.querySelector('#next-scene').addEventListener('click', () => currentScene < 2 ? goToScene(currentScene + 1) : document.querySelector('#works').scrollIntoView({behavior: reducedMotion ? 'instant' : 'smooth'}));
let scrollQueued = false;
addEventListener('scroll', () => { if(!scrollQueued) { scrollQueued = true; requestAnimationFrame(() => { scrollQueued = false; readStory(); }); } }, {passive: true});
addEventListener('resize', readStory);
readStory();
document.querySelector('#year').textContent = new Date().getFullYear();

const projects = window.PORTFOLIO_PROJECTS;
const grid = document.querySelector('#project-grid');
const dialog = document.querySelector('#project-dialog');
const dialogScroll = document.querySelector('#dialog-scroll');
const content = document.querySelector('#dialog-content');
let lastProjectButton;
let previousScroll = 0;
let previousPadding = '';
function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
projects.forEach((project, i) => {
  const button = element('button', 'project-card');
  button.classList.add(`is-${project.coverShape || 'landscape'}`);
  button.setAttribute('aria-label', `查看作品：${project.title} / ${project.en}`);
  button.setAttribute('aria-haspopup', 'dialog');
  const art = element('div', 'project-art');
  const image = element('img'); image.src = project.cover; image.alt = project.title; image.loading = 'lazy'; image.decoding = 'async';
  art.append(image, element('span', 'project-number', String(i+1).padStart(2,'0')), element('span', 'project-type', project.category), element('span', 'open-project', '↗'));
  const info = element('div', 'project-info');
  const title = element('div'); title.append(element('h3', '', project.title), element('p', '', project.en));
  const counts = []; if (project.videos.length) counts.push(`${project.videos.length} FILM${project.videos.length > 1 ? 'S' : ''}`); if(project.images.length) counts.push(`${project.images.length} IMAGES`);
  info.append(title, element('span', '', counts.join(' / ')));
  button.append(art, info); button.addEventListener('click', () => openProject(project, button)); grid.append(button);
});
function openProject(project, button) {
  lastProjectButton = button;
  document.querySelector('#dialog-title').textContent = project.title;
  document.querySelector('#dialog-english').textContent = project.en;
  const description = document.querySelector('#dialog-description');
  description.textContent = project.description || '';
  description.hidden = !project.description;
  document.querySelector('#dialog-category').textContent = `${project.zhcategory} / ${project.category}`;
  document.querySelector('#dialog-number').textContent = `PROJECT ${String(project.id).padStart(2, '0')} / XIAO CHENYU`;
  content.replaceChildren();
  function renderVideos() {
    if (!project.videos.length) return;
    const videos = element('div', `project-videos${project.videoLayout === 'portrait' ? ' is-portrait' : ''}`);
    project.videos.forEach((asset, i) => {
      const figure = element('figure'); const video = element('video');
      video.controls = true; video.playsInline = true; video.preload = 'metadata'; video.poster = asset.poster;
      if (asset.width) video.style.maxWidth = `${asset.width}px`;
      if (asset.sources?.length) {
        asset.sources.forEach(item => { const source = element('source'); source.src = item.src; source.type = item.type; video.append(source); });
      } else {
        video.src = asset.src;
      }
      video.setAttribute('aria-label', `${project.title}，视频 ${i+1}`);
      figure.append(video, element('figcaption', '', `${asset.title || project.title} / ${String(i+1).padStart(2, '0')}`)); videos.append(figure);
    });
    content.append(videos);
  }
  function renderImages() {
    if (!project.images.length) return;
    const images = element('div', 'project-images');
    project.images.forEach((asset, i) => {
      const figure = element('figure', asset.width / asset.height > 1.35 || project.title === 'IP 全案与周边设计' && i === 0 ? 'wide' : '');
      const img = element('img'); img.src = asset.src; img.alt = `${project.title} — 作品图 ${i+1}`; img.loading = i < 2 ? 'eager' : 'lazy'; img.decoding = 'async'; img.width = asset.width; img.height = asset.height;
      figure.append(img); images.append(figure);
    });
    content.append(images);
  }
  function renderDocuments(documents, primary = false) {
    if (!documents.length) return;
    const docs = element('div', 'project-documents');
    if (primary) docs.classList.add('is-primary');
    documents.forEach(doc => {
      const detail = element('details'); detail.append(element('summary', '', `${doc.title} / Creative notes`));
      const text = element('div', 'doc-text'); doc.paragraphs.forEach(paragraph => text.append(element('p', '', paragraph))); detail.append(text); docs.append(detail);
    });
    content.append(docs);
  }
  function renderSectionTitle(text) { content.append(element('h3', 'project-section-title', text)); }
  if (project.layout === 'script-assets-storyboard') {
    renderSectionTitle('剧本 / SCRIPT');
    renderDocuments(project.documents.slice(0, 1), true);
    renderSectionTitle('角色与视觉资产 / CHARACTER & VISUAL ASSETS');
    renderImages();
    renderSectionTitle('分镜与生成提示词 / STORYBOARD & PROMPTS');
    renderDocuments(project.documents.slice(1));
    renderSectionTitle('动态片段 / MOTION STUDIES');
    renderVideos();
  } else {
    renderVideos();
    renderImages();
    renderDocuments(project.documents);
  }
  previousScroll = window.scrollY;
  previousPadding = document.body.style.paddingRight;
  document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
  document.body.classList.add('modal-open');
  dialog.showModal(); dialogScroll.scrollTop = 0; document.querySelector('#close-dialog').focus({preventScroll:true});
}
function closeProject() { dialog.close(); }
document.querySelector('#close-dialog').addEventListener('click', closeProject);
document.querySelector('#back-to-work').addEventListener('click', closeProject);
dialog.addEventListener('click', event => { if(event.target === dialog) { const rect = dialog.getBoundingClientRect(); if(event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeProject(); } });
dialog.addEventListener('close', () => {
  content.querySelectorAll('video').forEach(video => { video.pause(); video.removeAttribute('src'); video.querySelectorAll('source').forEach(source => source.removeAttribute('src')); video.load(); });
  document.body.classList.remove('modal-open'); document.body.style.paddingRight = previousPadding;
  scrollTo({top:previousScroll,behavior:'instant'}); lastProjectButton?.focus({preventScroll:true});
});
let toastTimer;
function toast(message) { const node = document.querySelector('#toast'); node.textContent = message; node.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('visible'), 3200); }
document.querySelectorAll('.copy-wechat').forEach(button => button.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText('Cc061214lili'); toast('微信号已复制 / WeChat ID copied'); }
  catch { toast('微信号：Cc061214lili（长按或选中复制）'); }
}));

// Each pointer movement leaves a short-lived wave; the image itself refracts.
async function initializeWater() {
  const canvas = document.querySelector('#water');
  const gl = canvas.getContext('webgl', {alpha:false, antialias:false, powerPreference:'low-power'});
  if(!gl) return;
  const vertexSource = `attribute vec2 position; varying vec2 vUv; void main(){vUv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
  const fragmentSource = `precision highp float;
    varying vec2 vUv;
    uniform sampler2D image0;uniform sampler2D image1;uniform sampler2D image2;
    uniform vec2 resolution;uniform vec2 size0;uniform vec2 size1;uniform vec2 size2;
    uniform float scene;uniform float time;uniform vec4 waves[14];
    vec2 cover(vec2 uv,vec2 imageSize,float zoom,float shift){
      float screenRatio=resolution.x/resolution.y;float imageRatio=imageSize.x/imageSize.y;
      vec2 scale=vec2(min(screenRatio/imageRatio,1.),min(imageRatio/screenRatio,1.));
      return (uv-.5)*scale/zoom+.5+vec2(shift,0.);
    }
    vec3 sampleImage(sampler2D image,vec2 uv){return texture2D(image,clamp(uv,vec2(.001),vec2(.999))).rgb;}
    void main(){
      vec2 uv=vUv;vec2 offset=vec2(0.);float light=0.;float aspect=resolution.x/resolution.y;
      for(int i=0;i<14;i++){
        vec4 wave=waves[i];float age=time-wave.z;
        if(age>0.&&age<2.4&&wave.w>0.){
          vec2 delta=(uv-wave.xy)*vec2(aspect,1.);float distance=length(delta);
          float ring=distance-age*.18;
          float envelope=exp(-ring*ring*180.)*exp(-age*1.75)*wave.w;
          float ripple=sin(ring*66.-age*3.)*envelope;
          offset+=delta/(distance+.015)*ripple*.008/vec2(aspect,1.);
          light+=ripple*.018;
        }
      }
      // Keep faces comparatively calm, leaving the stronger refraction at the edges.
      float face=exp(-length((uv-vec2(.5,.56))*vec2(2.,2.8))*5.);
      offset*=1.-face*.75;uv+=offset;
      float mobile=1.-step(.8,aspect);
      vec2 firstUV=cover(uv,size0,1.+min(scene,1.)*.045,0.);
      vec2 secondUV=cover(uv,size1,1.,mix(.14,0.,mobile));
      vec2 thirdUV=cover(uv,size2,1.+(2.-scene)*.035,0.);
      vec3 first=sampleImage(image0,firstUV);
      vec3 second=sampleImage(image1,secondUV);
      if(mobile>.5) second=mix(vec3(.032,.07,.13),vec3(.095,.18,.29),uv.y);
      vec3 third=sampleImage(image2,thirdUV);
      float imageRatio=size2.x/size2.y;
      vec2 containScale=vec2(max(aspect/imageRatio,1.),max(imageRatio/aspect,1.));
      vec2 fitted=(uv-vec2(.5,mix(.5,.56,mobile)))*containScale+.5;
      float inside=step(0.,fitted.x)*step(fitted.x,1.)*step(0.,fitted.y)*step(fitted.y,1.);
      third=mix(vec3(.032,.07,.13),sampleImage(image2,fitted),inside);
      vec3 color=mix(first,second,smoothstep(0.,1.,min(scene,1.)));
      color=mix(color,third,smoothstep(0.,1.,max(scene-1.,0.)));
      gl_FragColor=vec4(color+vec3(.65,.84,1.)*light,1.);
    }`;
  function shader(type, source) { const result = gl.createShader(type); gl.shaderSource(result,source); gl.compileShader(result); if(!gl.getShaderParameter(result,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result)); return result; }
  const program = gl.createProgram(); gl.attachShader(program,shader(gl.VERTEX_SHADER,vertexSource)); gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragmentSource)); gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program,'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const uniforms = Object.fromEntries(['resolution','scene','time','waves[0]','size0','size1','size2'].map(name=>[name,gl.getUniformLocation(program,name)]));
  const images = await Promise.all(sceneNames.map(name => new Promise((resolve,reject) => { const img = new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=`assets/${name}.webp`; })));
  images.forEach((img,i) => { gl.activeTexture(gl.TEXTURE0+i); const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);gl.uniform1i(gl.getUniformLocation(program,`image${i}`),i);gl.uniform2f(uniforms[`size${i}`],img.width,img.height); });
  const waves = new Float32Array(14*4);
  let waveIndex=0, lastPointer=0, lastWaveTime=-5, animation=0, width=0,height=0;
  function draw(timestamp=performance.now()) {
    animation=0;
    if(!storyVisible || document.hidden) return;
    const ratio=Math.min(devicePixelRatio,1.5);
    const nextWidth=Math.round(stage.clientWidth*ratio), nextHeight=Math.round(stage.clientHeight*ratio);
    if(width!==nextWidth || height!==nextHeight) { width=nextWidth;height=nextHeight;canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height); }
    const now=timestamp/1000;
    gl.uniform2f(uniforms.resolution,width,height);gl.uniform1f(uniforms.scene,sceneValue);gl.uniform1f(uniforms.time,now);gl.uniform4fv(uniforms['waves[0]'],waves);gl.drawArrays(gl.TRIANGLES,0,6);
    if(!reducedMotion && now-lastWaveTime<2.5) animation=requestAnimationFrame(draw);
  }
  function requestDraw(){if(!animation) animation=requestAnimationFrame(draw);}
  stage.addEventListener('pointermove', event => {
    if(reducedMotion || performance.now()-lastPointer<36) return;
    lastPointer=performance.now();lastWaveTime=lastPointer/1000;
    const rect=stage.getBoundingClientRect();const index=(waveIndex++%14)*4;
    waves[index]=(event.clientX-rect.left)/rect.width;waves[index+1]=1-(event.clientY-rect.top)/rect.height;waves[index+2]=lastWaveTime;waves[index+3]=.75;
    requestDraw();
  },{passive:true});
  new IntersectionObserver(entries=>{storyVisible=entries[0].isIntersecting;if(storyVisible)requestDraw();else if(animation){cancelAnimationFrame(animation);animation=0;}},{threshold:0}).observe(stage);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestDraw();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();canvas.classList.remove('ready');waterDraw=null;if(animation)cancelAnimationFrame(animation);});
  waterDraw=requestDraw;addEventListener('resize',requestDraw);requestDraw();canvas.classList.add('ready');
}
initializeWater().catch(()=>{document.querySelector('#water').classList.remove('ready');});
