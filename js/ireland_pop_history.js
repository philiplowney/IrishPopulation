	var camera, scene, renderer, raycaster, projector;
	
	var lightColor =	// D5F2D6
	{
		red:	0xD5,
		green:	0xF2,
		blue:	0xD6
	}
	var darkGreen =		// FF3636
	{
		red:	0xFF,
		green:	0x36,
		blue:	0x36
	}
	
	var islandZRotation = 0;
	var censusYears = [1841, 1851, 1861, 1871, 1881, 1891, 1901, 1911, 1926, 1936, 1946, 1951, 1956, 1961, 1966, 1971, 1979, 1981, 1986, 1991, 1996, 2002, 2006, 2011];
	var censusYearIndex = censusYears.length-1;
	var islands = [];
	
	var maxCountyHeight = 2000;
	var maxCountyPopulation = 1400000; //in 2011 Dublin was 1.3 Million approx.
	
	var mouse = new THREE.Vector2(), INTERSECTED;
		
	function load()
	{
		initialiseButtons();
		// county shapes/meshes
		
		var percentComplete = 0;
		var totalSteps = censusYears.length + countiesArray.length;
		var percentStep = 100/totalSteps;
		
		var countyNo = 0
		var islandNo = 0;
		makeCounty();
		function makeCounty()
		{
			var county = countiesArray[countyNo];
			updateLoadProgress(percentComplete, 'County '+county.name);
			// county shapes
			county.shape = getCountyShape(county.polygon);
			// county meshes
			county.meshes = [];
			for(var k = 0; k < censusYears.length; k++)
			{
				var countyPopulation = county.populationHistory[k];
				var popFractionOfMax = (countyPopulation/maxCountyPopulation);
				var extrudeHeight = popFractionOfMax*maxCountyHeight;
				
				var extrudeSettings = { amount: extrudeHeight }; // bevelSegments: 2, steps: 2 , bevelSegments: 5, bevelSize: 8, bevelThickness:5
				var geometry = new THREE.ExtrudeGeometry( county.shape, extrudeSettings );
				
				var redDiff = darkGreen.red - lightColor.red;
				var greenDiff = darkGreen.green - lightColor.green;
				var blueDiff = darkGreen.blue - lightColor.blue;
				var countyColor = ((lightColor.red + redDiff*popFractionOfMax)<<16)+((lightColor.green + greenDiff*popFractionOfMax)<<8)+(lightColor.blue + blueDiff*popFractionOfMax);
				
				var material = new THREE.MeshLambertMaterial( { color: countyColor } );
				var mesh = new THREE.Mesh( geometry, material );
				county.meshes.push(mesh);
			}
			percentComplete+=percentStep;
			countyNo++;
			if(countyNo< countiesArray.length)
			{	setTimeout(makeCounty, 50);}
			else
			{
				makeIsland();				
			}
		}
		//islands
		function makeIsland() //asynchronous loop
		{
			updateLoadProgress(percentComplete, 'Census '+censusYears[islandNo]);
			var island = new THREE.Object3D();
			island.position.y = 0;
			island.rotation.z = islandZRotation;
			for(var j = 0; j<countiesArray.length ; j++)
			{
				var county = countiesArray[j];
				var meshForChosenYear = county.meshes[islandNo];
				island.add(meshForChosenYear);
			}
			islands.push(island);
			percentComplete+=percentStep;
			islandNo++; 
			if(islandNo<censusYears.length)
			{	setTimeout(makeIsland, 50);}
			else
			{	
				updateLoadProgress(100, 'Done!');
				finishLoading();
			};
		}
	}
	
	function updateLoadProgress(percentComplete, infoText)
	{
		$( "#progressBar" ).progressbar({  value: percentComplete	});
		$( "#progressText" ).val(infoText +'...');
	}
	
	function finishLoading()
	{
		$( "#loadingArea" ).effect( "fade", { percent: 0 }, 500);
		$( "#year-wrapper" ).css( "visibility", 'visible');
		$( "#nav-controls" ).css( "visibility", 'visible');
		initialiseScene();
		updateScene(null, censusYearIndex);
		document.addEventListener( 'mousemove', onDocumentMouseMove, false );
		animate();
	}
	function onDocumentMouseMove( event ) 
	{
		event.preventDefault();
		mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
		mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
	}
	
	function initialiseScene()
	{
		raycaster = new THREE.Raycaster();
		projector = new THREE.Projector();
		
		var geometry, material;
		camera = new THREE.PerspectiveCamera( 100, 1, 1, 10000 );
		camera.position.z = 1800;
		camera.position.y = -5500;
		camera.position.x = -300;
		camera.rotation.x = 0.7;

		scene = new THREE.Scene();
		
		var directionalLight = new THREE.DirectionalLight( 0xffffff );
		directionalLight.position.set( 1000,-1000,1000);
		scene.add( directionalLight );
		
		var ambientLight = new THREE.AmbientLight(0x222222);
		scene.add(ambientLight);
			
		var theCanvas = document.getElementById('ireland-container');
		renderer = new THREE.WebGLRenderer({canvas: theCanvas, antialias: true });
		renderer.setSize( 1000, 1000 );
		
		renderer.render( scene, camera );
	}
	
	function updateScene(formerYearIndex, currentYearIndex)
	{
		if(formerYearIndex != null)
		{
			scene.remove(islands[formerYearIndex]);
		}
		$( "#selectedYear" ).val(censusYears[censusYearIndex] );
		scene.add( islands[currentYearIndex] );
		islands[currentYearIndex].rotation.z = islandZRotation;
		renderer.render( scene, camera );
	}

	// navigation-related stuff
	function initialiseButtons()
	{
		// how much to rotate by on each button-click
		var rotationStep = 0.5;
		// rotate right
		$("#rotateRightButton").button({ icons: { primary: "ui-icon-circle-triangle-e"}, text: false });
		$( "#rotateRightButton" ).on( "click", function( event, ui ) { navRequest.rotateRight = rotationStep; } );
		
		$("#rotateLeftButton").button({ icons: { primary: "ui-icon-circle-triangle-w"}, text: false });
		$( "#rotateLeftButton" ).on( "click", function( event, ui ) { navRequest.rotateLeft = rotationStep; } );
	}
	
	// navigation requests from UI
	var navRequest = 
	{
		rotateRight:	0,
		rotateLeft:		0
	}
	
	// the amount you should rotate (if any) on each frame
	var rotateStep = 0.02;
	function animate()
	{
		// note: three.js includes requestAnimationFrame shim
		requestAnimationFrame( animate );
		if(navRequest.rotateRight > 0)
		{
			islandZRotation += rotateStep;
			islands[censusYearIndex].rotation.z = islandZRotation;
			navRequest.rotateRight -= rotateStep;
		}
		if(navRequest.rotateLeft > 0)
		{
			islandZRotation -= rotateStep;
			islands[censusYearIndex].rotation.z = islandZRotation;
			navRequest.rotateLeft -= rotateStep;
		}
		
		var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
		projector.unprojectVector( vector, camera );

		raycaster.set( camera.position, vector.sub( camera.position ).normalize() );

		var intersects = raycaster.intersectObjects( scene.children[3].children );
		
		if ( intersects.length > 0 ) {

			if ( INTERSECTED != intersects[ 0 ].object ) {

				if ( INTERSECTED ) INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );

				INTERSECTED = intersects[ 0 ].object;
				INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
				INTERSECTED.material.emissive.setHex( 0xff0000 );

			}
		} else {

			if ( INTERSECTED ) INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );

			INTERSECTED = null;

		}
	
		
		renderer.render( scene, camera );
	}
	
	function getCountyShape(countyPolygonArray)
	{
		var countyPoints = [];
		var step;
		if(countyPolygonArray.length<500)
		{	step = 2;	}
		else if(countyPolygonArray.length<1000)
		{	step =	7;	}
		else if(countyPolygonArray.length<15000)
		{	step = 30;	}
		else
		{	step = 30;	}
		for(var i=0 ; i<countyPolygonArray.length; i+=step)
		{
			var x = (countyPolygonArray[i][0]+7)*1000;
			var y = (((countyPolygonArray[i][1])-52)*1200);
			y+=-2000;
			x+=900;
			countyPoints.push( new THREE.Vector2 (x, y));
		}
		
		return new THREE.Shape( countyPoints );
	}
	
	$(function() {
    $( "#slider" ).slider
	({
		value:censusYears.length-1,
		min: 0,
		max: censusYears.length-1,
		step: 1,
		slide: function( event, ui )
		{
			updateScene(censusYearIndex, ui.value);
			censusYearIndex = ui.value;
		}
    });
  });