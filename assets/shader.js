/* ------------------------------------------------------------------
   Hintergrund aus zwei Shadern auf einer einzigen Zeichenflaeche.

   Die Shader stammen aus React Bits (MIT, Commons Clause):
   GradientWaves und Lightfall, https://reactbits.dev
   Uebernommen ist der GLSL-Code, nicht die React-Huelle. Statt ogl
   laeuft hier ein eigener, kleiner WebGL-Aufsatz: ein Vollbild-Dreieck,
   zwei Programme, ein Bild pro Frame. Damit braucht das Projekt keine
   Abhaengigkeit und keinen Buildschritt.

   Regeln, die hier eingebaut sind:
   - eine Zeichenflaeche, nicht zwei
   - die Aufloesung ist absichtlich kleiner als der Bildschirm, die
     Verlaeufe sind weich, das sieht man nicht und es halbiert die Last
   - ausserhalb des Bildes, im versteckten Tab und bei --p = 0 wird
     nichts gerechnet
   - ohne WebGL2 und bei "weniger Bewegung" bleibt es einfach aus
------------------------------------------------------------------ */

(function (global) {
  "use strict";

  var VERTEX = [
    "#version 300 es",
    "in vec2 position;",
    "void main() { gl_Position = vec4(position, 0.0, 1.0); }"
  ].join("\n");

  /* --------------------------------------------------- GradientWaves */

  var WELLEN = [
    "#version 300 es",
    "precision highp float;",
    "uniform vec2 iResolution;",
    "uniform float iTime;",
    "uniform float uSpeed;",
    "uniform float uAmplitude;",
    "uniform float uWaveScale;",
    "uniform float uWaveRatio;",
    "uniform float uSwell;",
    "uniform float uTurbulence;",
    "uniform float uTilt;",
    "uniform float uZoom;",
    "uniform float uHeight;",
    "uniform float uFogDepth;",
    "uniform float uSteps;",
    "uniform float uBrightness;",
    "uniform float uOpacity;",
    "uniform vec3 uHorizonColor;",
    "uniform vec3 uWaveColor;",
    "uniform vec3 uCrestColor;",
    "out vec4 fragColor;",
    "const float MAX_DIST = 20000.0;",
    "float plasma(vec3 r, vec2 freq, vec4 tc) {",
    "  float mx = r.x + tc.x;",
    "  mx += uSwell * sin((r.y + mx) / 20.0 + tc.y);",
    "  float my = r.y - tc.z;",
    "  my += uTurbulence * cos(r.x / 23.0 + tc.w);",
    "  return r.z - (sin(mx * freq.x) * uAmplitude + sin(my * freq.y) * uAmplitude + uHeight);",
    "}",
    "float raymarch(vec3 pos, vec3 dir, vec2 freq, vec4 tc) {",
    "  float dist = 0.0;",
    "  for (int i = 0; i < 128; i++) {",
    "    if (float(i) >= uSteps) break;",
    "    float dscene = plasma(pos + dist * dir, freq, tc);",
    "    if (abs(dscene) < 0.1) break;",
    "    dist += 0.9 * dscene;",
    "    if (!(abs(dist) < MAX_DIST)) return MAX_DIST;",
    "  }",
    "  return dist;",
    "}",
    "void main() {",
    "  float T = iTime * uSpeed;",
    "  vec2 freq = vec2(uWaveScale / 7.0, (uWaveScale * uWaveRatio) / 3.0);",
    "  vec4 tc = vec4(T / 0.130, T / 0.810, T / 0.200, T / 0.710);",
    "  float c, s;",
    "  float vfov = (3.14159 / 2.3) / max(uZoom, 0.05);",
    "  vec3 cam = vec3(0.0, 0.0, 30.0);",
    "  vec2 uv = (gl_FragCoord.xy / iResolution.xy) - 0.5;",
    "  uv.x *= iResolution.x / iResolution.y;",
    "  uv.y *= -1.0;",
    "  vec3 dir = vec3(0.0, 0.0, -1.0);",
    "  float ulen = length(uv);",
    "  float xrot = vfov * ulen;",
    "  c = cos(xrot); s = sin(xrot);",
    "  dir = mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c) * dir;",
    "  vec2 nuv = ulen > 1e-5 ? uv / ulen : vec2(1.0, 0.0);",
    "  c = nuv.x; s = nuv.y;",
    "  dir = mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0) * dir;",
    "  c = cos(uTilt); s = sin(uTilt);",
    "  dir = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c) * dir;",
    "  float dist = raymarch(cam, dir, freq, tc);",
    "  vec3 pos = cam + dist * dir;",
    "  float t = clamp(uFogDepth / max(dist, 0.001), 0.0, 1.0);",
    "  vec3 body = mix(uWaveColor, uCrestColor, clamp(pos.z * 0.08 + 0.5, 0.0, 1.0));",
    "  vec3 col = mix(uHorizonColor, body, t);",
    "  col *= uBrightness;",
    "  col = clamp(col, 0.0, 1.0);",
    "  float alpha = clamp(t, 0.0, 1.0) * uOpacity;",
    "  fragColor = vec4(col * alpha, alpha);",
    "}"
  ].join("\n");

  /* ------------------------------------------------------- Lightfall */

  var STRAHLEN = [
    "#version 300 es",
    "precision highp float;",
    "uniform vec2 iResolution;",
    "uniform float iTime;",
    "uniform vec3 uColor0;",
    "uniform vec3 uColor1;",
    "uniform vec3 uColor2;",
    "uniform int uColorCount;",
    "uniform vec3 uBgColor;",
    "uniform float uSpeed;",
    "uniform int uStreakCount;",
    "uniform float uStreakWidth;",
    "uniform float uStreakLength;",
    "uniform float uGlow;",
    "uniform float uDensity;",
    "uniform float uTwinkle;",
    "uniform float uZoom;",
    "uniform float uBgGlow;",
    "uniform float uOpacity;",
    "uniform float uLightMode;",
    "out vec4 fragColor;",
    "vec3 palette(float h) {",
    "  int count = uColorCount < 1 ? 1 : uColorCount;",
    "  int idx = int(floor(clamp(h, 0.0, 0.999999) * float(count)));",
    "  if (idx <= 0) return uColor0;",
    "  if (idx == 1) return uColor1;",
    "  return uColor2;",
    "}",
    "vec3 tanhv(vec3 x) {",
    "  vec3 e = exp(-2.0 * x);",
    "  return (1.0 - e) / (1.0 + e);",
    "}",
    "vec2 sceneC(vec2 frag, vec2 r) {",
    "  vec2 P = (frag + frag - r) / r.x;",
    "  float z = 0.0;",
    "  float d = 1e3;",
    "  vec4 O = vec4(0.0);",
    "  for (int k = 0; k < 39; k++) {",
    "    if (d <= 1e-4) break;",
    "    O = z * normalize(vec4(P, uZoom, 0.0)) - vec4(0.0, 4.0, 1.0, 0.0) / 4.5;",
    "    d = 1.0 - sqrt(length(O * O));",
    "    z += d;",
    "  }",
    "  return vec2(O.x, atan(O.z, O.y));",
    "}",
    "void main() {",
    "  vec2 r = iResolution.xy;",
    "  vec2 C = gl_FragCoord.xy;",
    "  vec2 uv0 = (C + C - r) / r.x;",
    "  float T = 0.1 * iTime * uSpeed + 9.0;",
    "  float angRings = max(1.0, floor(6.28318530718 * max(uDensity, 0.05) + 0.5));",
    "  vec2 Y = vec2(5e-3, 6.28318530718 / angRings);",
    "  vec2 c0 = sceneC(C, r);",
    "  vec2 cdx = sceneC(C + vec2(1.0, 0.0), r);",
    "  vec2 cdy = sceneC(C + vec2(0.0, 1.0), r);",
    "  vec2 dCx = cdx - c0;",
    "  vec2 dCy = cdy - c0;",
    "  dCx.y -= 6.28318530718 * floor(dCx.y / 6.28318530718 + 0.5);",
    "  dCy.y -= 6.28318530718 * floor(dCy.y / 6.28318530718 + 0.5);",
    "  vec2 fw = abs(dCx) + abs(dCy);",
    "  C = c0;",
    "  vec2 P = vec2(2.0, 1.0) * uv0 - (r / r.x) * vec2(0.0, 1.0);",
    "  vec4 O = vec4(uBgColor * 90.0 * uBgGlow / (1e3 * dot(P, P) + 6.0), 0.0);",
    "  float zr = 5e-4 * uStreakWidth;",
    "  vec2 rr = vec2(max(length(fw), 1e-5));",
    "  float tail = 19.0 / max(uStreakLength, 0.05);",
    "  for (int m = 0; m < 16; m++) {",
    "    if (m >= uStreakCount) break;",
    "    float jf = float(m) + 1.0;",
    "    float ic = fract(sin(dot(vec2(jf, floor(C.x / Y.x + 0.5)), vec2(7.0, 11.0)) * 73.0));",
    "    vec2 Pp = C - (T + T * ic) * vec2(0.0, 1.0);",
    "    Pp -= floor(Pp / Y + 0.5) * Y;",
    "    float h = fract(8663.0 * ic);",
    "    vec3 col = palette(h);",
    "    float weight = mix(1.5, 1.0 + sin(T + 7.0 * h + 4.0), uTwinkle);",
    "    vec2 inner = vec2(length(max(Pp, vec2(-1.0, 0.0))), length(Pp) - zr) - zr;",
    "    vec2 sm = vec2(1.0) - smoothstep(-rr, rr, inner);",
    "    O.rgb += dot(sm, vec2(exp(tail * Pp.y), 3.0)) * col * weight;",
    "    C.x += Y.x / 8.0;",
    "  }",
    "  vec3 colr = sqrt(tanhv(max(O.rgb * uGlow - vec3(0.04, 0.08, 0.02), 0.0)));",
    // Auf hellem Grund ist addiertes Licht unsichtbar. Der helle Zweig
    // stammt aus der Vorlage: statt Licht dazuzugeben liefert er einen
    // Farbton, der die Flaeche darunter einfaerbt. Gezeichnet wird er
    // mit vorgemultipliztem Alpha, damit dort, wo kein Strahl ist, auch
    // nichts eingefaerbt wird.
    "  if (uLightMode > 0.5) {",
    "    float peak = max(colr.r, max(colr.g, colr.b));",
    "    float deckung = smoothstep(0.035, 0.58, peak) * uOpacity;",
    "    vec3 chroma = clamp(colr / max(peak, 1e-4), 0.0, 1.0);",
    "    chroma = pow(chroma, vec3(1.35));",
    "    float spitze = max(chroma.r, max(chroma.g, chroma.b));",
    "    chroma /= max(spitze, 1e-4);",
    "    vec3 ton = mix(vec3(1.0), chroma, 0.94);",
    "    fragColor = vec4(ton * deckung, deckung);",
    "  } else {",
    "    fragColor = vec4(colr, uOpacity);",
    "  }",
    "}"
  ].join("\n");

  function hexZuRgb(hex) {
    var c = String(hex).replace("#", "");
    return [
      parseInt(c.slice(0, 2), 16) / 255,
      parseInt(c.slice(2, 4), 16) / 255,
      parseInt(c.slice(4, 6), 16) / 255
    ];
  }

  function baue(gl, quelle, art) {
    var sh = gl.createShader(art);
    gl.shaderSource(sh, quelle);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh) || "Shader");
    }
    return sh;
  }

  function programm(gl, fragment) {
    var p = gl.createProgram();
    gl.attachShader(p, baue(gl, VERTEX, gl.VERTEX_SHADER));
    gl.attachShader(p, baue(gl, fragment, gl.FRAGMENT_SHADER));
    gl.bindAttribLocation(p, 0, "position");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(p) || "Programm");
    }
    var u = {};
    var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) {
      var name = gl.getActiveUniform(p, i).name;
      u[name] = gl.getUniformLocation(p, name);
    }
    return { p: p, u: u };
  }

  global.hintergrundShader = function (leinwand, einst) {
    einst = einst || {};

    var gl = leinwand.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: "low-power"
    });
    if (!gl) return null;

    var wellen, strahlen;
    try {
      wellen = programm(gl, WELLEN);
      strahlen = programm(gl, STRAHLEN);
    } catch (e) {
      return null;
    }

    var puffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, puffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);

    // Absichtlich unter der Bildschirmaufloesung. Weiche Verlaeufe
    // vertragen das, und es ist der groesste einzelne Gewinn.
    var mass = einst.mass || 0.7;
    var b = 1, h = 1;

    function groesse() {
      var r = leinwand.getBoundingClientRect();
      var dpr = Math.min(1.25, global.devicePixelRatio || 1);
      b = Math.max(1, Math.round(r.width * dpr * mass));
      h = Math.max(1, Math.round(r.height * dpr * mass));
      if (leinwand.width !== b || leinwand.height !== h) {
        leinwand.width = b;
        leinwand.height = h;
      }
    }

    function setze(pr, werte) {
      gl.useProgram(pr.p);
      for (var k in werte) {
        var loc = pr.u[k];
        if (!loc) continue;
        var v = werte[k];
        if (typeof v === "number") gl.uniform1f(loc, v);
        else if (typeof v === "boolean") gl.uniform1i(loc, v ? 1 : 0);
        else if (v.length === 2) gl.uniform2f(loc, v[0], v[1]);
        else if (v.length === 3) gl.uniform3f(loc, v[0], v[1], v[2]);
      }
    }

    function setzeInt(pr, name, wert) {
      gl.useProgram(pr.p);
      if (pr.u[name]) gl.uniform1i(pr.u[name], wert);
    }

    var hellAn = false;

    function wellenSatz(w) {
      return {
        uSpeed: w.speed != null ? w.speed : 0.25,
        uAmplitude: w.amplitude != null ? w.amplitude : 2.5,
        uWaveScale: w.waveScale != null ? w.waveScale : 0.6,
        uWaveRatio: w.waveRatio != null ? w.waveRatio : 0.9,
        uSwell: w.swell != null ? w.swell : 35,
        uTurbulence: w.turbulence != null ? w.turbulence : 20,
        uTilt: w.tilt != null ? w.tilt : 1.11,
        uZoom: w.zoom != null ? w.zoom : 1,
        uHeight: w.height != null ? w.height : 5.5,
        uFogDepth: w.fogDepth != null ? w.fogDepth : 15,
        uSteps: w.steps != null ? w.steps : 40,
        uBrightness: w.brightness != null ? w.brightness : 0.75,
        uOpacity: w.opacity != null ? w.opacity : 0.4,
        uHorizonColor: hexZuRgb(w.horizonColor || "#2a1a4d"),
        uWaveColor: hexZuRgb(w.waveColor || "#6a34d8"),
        uCrestColor: hexZuRgb(w.crestColor || "#c9a6ff")
      };
    }

    function strahlenSatz(s) {
      var f = s.colors || ["#cea4ff", "#b86fff", "#ffa5e2"];
      return {
        uColor0: hexZuRgb(f[0]),
        uColor1: hexZuRgb(f[1] || f[0]),
        uColor2: hexZuRgb(f[2] || f[0]),
        uBgColor: hexZuRgb(s.backgroundColor || "#2a1150"),
        uSpeed: s.speed != null ? s.speed : 0.55,
        uStreakWidth: s.streakWidth != null ? s.streakWidth : 1,
        uStreakLength: s.streakLength != null ? s.streakLength : 1.1,
        uGlow: s.glow != null ? s.glow : 1,
        uDensity: s.density != null ? s.density : 0.7,
        uTwinkle: s.twinkle != null ? s.twinkle : 0.8,
        uZoom: s.zoom != null ? s.zoom : 3,
        uBgGlow: s.backgroundGlow != null ? s.backgroundGlow : 0.35,
        uOpacity: s.opacity != null ? s.opacity : 0.9
      };
    }

    var w = einst.wellen || {};
    var s = einst.strahlen || {};

    var wellenWerte = wellenSatz(w);
    var strahlenWerte = strahlenSatz(s);
    var wellenHell = wellenSatz(einst.wellenHell || w);
    var strahlenHell = strahlenSatz(einst.strahlenHell || s);

    setze(wellen, wellenWerte);
    setze(strahlen, strahlenWerte);
    setzeInt(strahlen, "uColorCount", 3);
    setzeInt(strahlen, "uStreakCount", s.streakCount != null ? s.streakCount : 3);

    var raf = 0;
    var laeuft = false;

    // Eigene Zeitrechnung statt der rohen Uhr. Nur so laesst sich das
    // Tempo aendern, ohne dass die Bewegung springt.
    var zeit = 0;
    var vorher = 0;
    var ruheK = 0;

    function bild(uhr) {
      if (!laeuft) return;
      var dt = vorher ? (uhr - vorher) / 1000 : 0.016;
      vorher = uhr;
      if (!(dt > 0)) dt = 0.016;
      if (dt > 0.05) dt = 0.05;
      zeit += dt * (1 - 0.55 * ruheK);
      var t = zeit;

      gl.viewport(0, 0, b, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Wellen: vorgemultipliztes Alpha, also normal darueber.
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(wellen.p);
      if (wellen.u.iResolution) gl.uniform2f(wellen.u.iResolution, b, h);
      if (wellen.u.iTime) gl.uniform1f(wellen.u.iTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Dunkel sind die Strahlen Licht und werden addiert. Hell sind
      // sie ein Farbton und werden normal darueber gelegt, die Flaeche
      // faerbt dann spaeter per multiply die Seite ein.
      if (hellAn) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      else gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(strahlen.p);
      if (strahlen.u.iResolution) gl.uniform2f(strahlen.u.iResolution, b, h);
      if (strahlen.u.iTime) gl.uniform1f(strahlen.u.iTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      raf = requestAnimationFrame(bild);
    }

    groesse();

    return {
      an: function () {
        if (laeuft) return;
        laeuft = true;
        vorher = 0;
        raf = requestAnimationFrame(bild);
      },

      // Umschalten zwischen dunkel und hell. Beide Zustaende haben
      // eigene Farben, nichts wird invertiert.
      modus: function (hell) {
        hellAn = !!hell;
        setze(wellen, hellAn ? wellenHell : wellenWerte);
        setze(strahlen, hellAn ? strahlenHell : strahlenWerte);
        setzeInt(strahlen, "uColorCount", 3);
        setzeInt(strahlen, "uStreakCount", s.streakCount != null ? s.streakCount : 3);
        gl.useProgram(strahlen.p);
        if (strahlen.u.uLightMode) gl.uniform1f(strahlen.u.uLightMode, hellAn ? 1 : 0);
        this.ruhe(ruheK);
      },

      // 0 heisst voller Betrieb, 1 heisst Ruhezustand hinter dem Inhalt:
      // langsamer und leiser, damit die Bewegung nicht vom Text abzieht.
      ruhe: function (k) {
        ruheK = k < 0 ? 0 : k > 1 ? 1 : k;
        var satz = hellAn ? strahlenHell : strahlenWerte;
        gl.useProgram(strahlen.p);
        if (strahlen.u.uOpacity) {
          gl.uniform1f(strahlen.u.uOpacity, satz.uOpacity * (1 - 0.2 * ruheK));
        }
        if (strahlen.u.uGlow) {
          gl.uniform1f(strahlen.u.uGlow, satz.uGlow * (1 - 0.15 * ruheK));
        }
      },
      aus: function () {
        laeuft = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      },
      neuMessen: function () {
        groesse();
      }
    };
  };
})(window);
