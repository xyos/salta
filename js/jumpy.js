var HERO_IMAGE = 'assets/hero.png';
var IMAGEN_PLATAFORMA = 'assets/platforma.png';
var IMAGEN_CASCADA = 'assets/cascada.png';
var IMAGEN_ABEJA = 'assets/abeja.png';
var BASE_WIDTH = 1280;
var BASE_HEIGHT = 720;
var GRID_HORIZONTAL = 18;
var GRID_VERTICAL = 14;

function juego() {
	window.Game = this;
	var self = this;
	var w = getWidth();
	self.width = w;
	var h = getHeight()-40;
	self.height = h; 
	var scale = snapValue(Math.min(w / BASE_WIDTH, h / BASE_HEIGHT), .15);
	self.scale = scale;
	var bee;
	var hero;
	var points;
	var wintext;
	var score;
	var ticks = 0;
	var canvas;
	var ctx;
	var stage;
	var background;
	var background_2;
	var world;
	var waterfallLayer;
	var assets = [];
	var spriteSheets = [];
	var parallaxObjects = [];
	var waterfalls = [];
	var keyDown = false;
	var speed = window.speed;





	// carga los objetos colisionables
	var collideables = [];
	self.getCollideables = function () { return collideables; };

	// precarga de todas las imagenes
	self.preloadResources = function () {
		self.loadImage(HERO_IMAGE);
		self.loadImage(IMAGEN_PLATAFORMA);
		self.loadImage(IMAGEN_CASCADA);
		self.loadImage(IMAGEN_ABEJA);
	}

	var requestedAssets = 0;
	var loadedAssets = 0;
	// cargamos las imagenes y llevamos la cuenta
	self.loadImage = function (e) {
		var img = new Image();
		img.onload = self.onLoadedAsset;
		img.src = e;
		assets[e] = img;
		++requestedAssets;
	}
	// esperamos a que cargue todas las imagenes para poder iniciar el juego
	self.onLoadedAsset = function (e) {
		++loadedAssets;
		if (loadedAssets == requestedAssets) {
			self.initializeGame();
		}
	}

	self.initializeGame = function () {
		// ajustamos las imagenes a la escala de la pantalla
		assets[HERO_IMAGE] = nearestNeighborScale(assets[HERO_IMAGE], scale);
		assets[IMAGEN_PLATAFORMA] = nearestNeighborScale(assets[IMAGEN_PLATAFORMA], scale);
		assets[IMAGEN_CASCADA] = nearestNeighborScale(assets[IMAGEN_CASCADA], scale * 2);
		assets[IMAGEN_ABEJA] = nearestNeighborScale(assets[IMAGEN_ABEJA], scale);

		self.initializeSpriteSheets();

		// creamos el canvas
		canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		document.body.appendChild(canvas);

		// inicializamos el stage
		stage = new Stage(canvas);
		// creamos el grid del fondo
		background = self.createBgGrid(GRID_HORIZONTAL, GRID_VERTICAL);
		stage.addChild(background);

		// creamos un efecto paralax con otra capa de fond
		background_2 = new Container();
		stage.addChild(background_2);
		for (var c = 0; c < 4; c++) {
			// añadimos una línea
			var line = self.createPixelLine((Math.random() * 3 + 1) | 0);
			background_2.addChild(line);
			// añadimos la linea al array de objetos en paralax
			parallaxObjects.push(line);
		}

		world = new Container();
		stage.addChild(world);

		waterfallLayer = new Container();
		stage.addChild(waterfallLayer);

		// creamos nuesto heroe y le asignamos la imagen
		hero = new Hero(assets[HERO_IMAGE]);
		points = 0;
		score = new createjs.Text("" + points + " puntos", "20px Arial", "#ff7700");
 		score.x = 100;
		score.y = 100;
		wintext = new createjs.Text("Nivel " + window.nivel, "60px Arial", "#ff7700");
 		wintext.x = 100;
		wintext.y = 200;
 		score.textBaseline = "alphabetic";
		wintext.textBaseline = "alphabetic";
		stage.addChild(score);
		stage.addChild(wintext);
		bee = new BitmapAnimation(spriteSheets[IMAGEN_ABEJA]);
		bee.gotoAndPlay('bee');

		self.reset();

		// iniciamos listeners en el documento
		if ('ontouchstart' in document.documentElement) {
			canvas.addEventListener('touchstart', function (e) {
				self.handleKeyDown();
			}, false);

			canvas.addEventListener('touchend', function (e) {
				self.handleKeyUp();
			}, false);
		} else {
			document.onkeydown = self.handleKeyDown;
			document.onkeyup = self.handleKeyUp;
			document.onmousedown = self.handleKeyDown;
			document.onmouseup = self.handleKeyUp;
		}
		//velocidad del juego
		Ticker.setFPS(window.speed);
		Ticker.addListener(self.tick, self);
	}

	self.initializeSpriteSheets = function () {
		// creamos la cascada
		var waterfallData = {
			images: [assets[IMAGEN_CASCADA]],
			frames: {
				// dimensiones de los frames
				height: 512 * scale,
				width: 16 * scale,
				// numero de frames
				count: 3
			},
			animations: {
				// creamos una animación
				run: {
					// contiene los 3 frames dentro de la imagen
					frames: [0, 1, 2],
					// elegimos la velocidad de la animacion
					frequency: 5
				}
			}
		}
		// añadimos la cascada a la lista de sprites
		spriteSheets[IMAGEN_CASCADA] = new SpriteSheet(waterfallData);
		// creamos la abeja
		var beeData = {
			images: [assets[IMAGEN_ABEJA]],
			// dimensiones de los frames
			frames: {
				height: 6 * scale,
				width: 16 * scale,
				regX: 8 * scale,
				regY: 3 * scale,
				count: 2
			},
			// animacion de la abeja
			animations: {
				bee: {
					frames: [0, 1],
					frequency: 1
				}
			}
		}
		// añadimos la abeja a la lista de sprites
		spriteSheets[IMAGEN_ABEJA] = new SpriteSheet(beeData);
	}
	// esta función reinicia el juego
	self.reset = function () {
		collideables = [];
		self.lastPlatform = null;
		world.removeAllChildren();
		waterfalls = [];
		waterfallLayer.removeAllChildren();
		world.x = world.y = 0;
		hero.x = 50 * scale;
		hero.y = h / 2 + 50 * scale;
		hero.reset();
		world.addChild(hero);
		world.addChild(bee);
		ticks = 0;
		points = 0;

		// añadimos una plataforma bajo el heroe
		self.addPlatform(10 * scale, h / 1.25);

		var c, l = w / (assets[IMAGEN_PLATAFORMA].width * 1.5) + 2, atX = 0, atY = h / 1.25;

		for (c = 1; c < l; c++) {
			var atX = (c - .5) * assets[IMAGEN_PLATAFORMA].width * 2 + (Math.random() * assets[IMAGEN_PLATAFORMA].width - assets[IMAGEN_PLATAFORMA].width / 2);
			var atY = atY + (Math.random() * 300 - 150) * scale;
			self.addPlatform(atX, atY);
		}
	}
	// elegimos que pasa en cada frame del juego
	self.tick = function (e) {
		var c, p, l;
		if( points >= 1000){
			wintext.text = "Ganaste";
			Ticker.setFPS(0.1);
			var url = "./nivel" + (nivel + 1) + ".html";
			console.log(url);
			setTimeout(function(){window.location.assign(url)  },2000);
		}
		ticks++;
		hero.tick();
		score.text= "" + points + " puntos";

		if (hero.y > h * 3) {
			self.reset();
			return;
		}

		// creamos el movimiento de la abeja
		bee.offsetX = (Math.cos(ticks / 10) * 10) * scale;
		bee.offsetY = (Math.sin(ticks / 7) * 5) * scale;
		// seguimos al heroe
		bee.x = bee.x + (hero.x - bee.x) * .1 + bee.offsetX;
		bee.y = bee.y + (hero.y - bee.y) * .1 + bee.offsetY;

		// centramos la pantalla
		if (hero.x > w * .3) {
			world.x = -hero.x + w * .3;
		}
		if (hero.y > h * .7) {
			world.y = -hero.y + h * .7;
		} else if (hero.y < h * .3) {
			world.y = -hero.y + h * .3;
		}

		l = collideables.length;
		for (c = 0; c < l; c++) {
			p = collideables[c];
			if (p.localToGlobal(p.image.width, 0).x < -10) {
				self.movePlatformToEnd(p);
			}
		}

		waterfallLayer.x = world.x;
		waterfallLayer.y = world.y;

		// movemos el fondo
		var bx = background.x;
		var nx= (world.x * .45) % (w / GRID_HORIZONTAL);

		if(bx != nx){
			points++;
		}
		background.x = (world.x * .45) % (w / GRID_HORIZONTAL);
		background.y = (world.y * .45) % (h / GRID_VERTICAL);

		l = parallaxObjects.length;

		for (c = 0; c < l; c++) {
			p = parallaxObjects[c];
			// movemos la lineas blancas
			p.x = ((world.x * p.speedFactor - p.offsetX) % p.range) + p.range;
		}

		stage.update();
	}
	// creamos el fondo
	self.createBgGrid = function (numX, numY) {
		var grid = new Container();
		grid.snapToPixel = true;
		// calculamos la distancia entre lineas
		var gw = w / numX;
		var gh = h / numY;
		// dibujamos la lineas horizontales
		var verticalLine = new Graphics();
		verticalLine.beginFill(Graphics.getRGB(101, 160, 176));
		verticalLine.drawRect(0, 0, gw * 0.03, gh * (numY + 2));
		var vs;
		//dibujamos lineas verticales
		for (var c = -1; c < numX + 1; c++) {
			vs = new Shape(verticalLine);
			vs.snapToPixel = true;
			vs.x = c * gw;
			vs.y = -gh;
			grid.addChild(vs);
		}
		var horizontalLine = new Graphics();
		horizontalLine.beginFill(Graphics.getRGB(101, 160, 176));
		horizontalLine.drawRect(0, 0, gw * (numX + 1), gh * 0.03);
		var hs;
		for (c = -1; c < numY + 1; c++) {
			hs = new Shape(horizontalLine);
			hs.snapToPixel = true;
			hs.x = 0;
			hs.y = c * gh;
			grid.addChild(hs);
		}

		// retornamos la grilla
		return grid;
	}

	self.createPixelLine = function (width) {
		// ajustamos el tamaño de la linea
		width = Math.max(Math.round(width * scale), 1);
		// drawing the line
		vl = new Graphics();
		vl.beginFill(Graphics.getRGB(255, 255, 255));
		vl.drawRect(0, 0, width, h);

		lineShape = new Shape(vl);
		lineShape.snapToPixel = true;
		// aplicamos transparencia
		lineShape.alpha = width * .25;
		// si está mas lejos la acemos desacelerar
		lineShape.speedFactor = 0.3 + lineShape.alpha * 0.3 + Math.random() * 0.2;
		// calculamos el momento en el que la linea debe regresar al inicio
		lineShape.range = w + Math.random() * w * .3;
		// hacemos que las lineas tengan una distancia para que no esten todas en el origen
		lineShape.offsetX = Math.random() * w;

		return lineShape;
	}

	// este metodo añade una plataforma y la añade a la lista de colisionables
	self.lastPlatform = null;
	self.addPlatform = function (x, y) {
		x = Math.round(x);
		y = Math.round(y);

		var platform = new Bitmap(assets[IMAGEN_PLATAFORMA]);
		platform.x = x;
		platform.y = y;
		platform.snapToPixel = true;
		// añadimos la cascada aleatoriamente
		if (Math.random() < .35) {
			self.addWaterfall(platform);
		}

		world.addChild(platform);
		collideables.push(platform);
		self.lastPlatform = platform;
	}
	self.addWaterfall = function (target) {
		var l = waterfalls.length,
			waterfall = null;
		for (c = 0; c < l; c++) {
			var w = waterfalls[c];
			if (w.localToGlobal(16, 0).x < -10) {
				waterfall = w;
				break;
			}
		}
		if (!waterfall) {
			var waterfall = new BitmapAnimation(spriteSheets[IMAGEN_CASCADA]);
			waterfall.snapToPixel = true;
			waterfall.gotoAndPlay('run');
			waterfallLayer.addChild(waterfall);
			waterfalls.push(waterfall);
		}

		waterfall.x = target.x + 32 * scale + Math.random() * (target.image.width - 64 * scale);
		waterfall.y = target.y;
	}

	self.movePlatformToEnd = function (platform) {
		platform.x = self.lastPlatform.x + platform.image.width * 2 + (Math.random() * platform.image.width * 2 - platform.image.width);
		platform.y = self.lastPlatform.y + (Math.random() * 300 - 150) * scale;
		if (Math.random() < .35) {
			self.addWaterfall(platform);
		}
		self.lastPlatform = platform;
	}

	self.handleKeyDown = function (e) {
		if (!keyDown) {
			keyDown = true;
			hero.jump();
		}
	}

	self.handleKeyUp = function (e) {
		keyDown = false;
	}

	self.preloadResources();
};

new juego();