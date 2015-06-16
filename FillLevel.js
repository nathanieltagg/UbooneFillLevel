$(function(){
  
  gFillLevel = new FillLevel($('#viewport'));
  gFillLevel.Rebuild();
  
  doTimer();
  setInterval(doTimer,10000);
  
  $('.trid-autorotate').click();
});


var gLevel = -100.0; // cm

function doTimer()
{
  // Get info
  var a = $.ajax({
    url: "get_vals.sh",
    contentType: "text/plain",
    complete: function( jqXHR , textStatus) {
      var val = jqXHR.responseText;
      var lines = val.split('\n');

      var txt = "";
      var readout = {};
      for(var i =0 ;i< lines.length; i++) {
        var p = lines[i].split(/[ ,]+/);
        if(p.length < 4) continue;
        console.log(p);
        var variable = p[0];
        readout[variable] = { name: variable, v: parseFloat(p[3]), d: p[1], t: p[2] }
      }
      console.log(readout);
      
      var r;
      r = readout["uB_Cryo_IFIX_1_0/TE194"];
      if(r) txt += "Top temp: " + r.v.toFixed(1) + "K  ";
      console.log(r)
      
      r = readout["uB_Cryo_IFIX_1_0/TE190"];
      if(r)  txt += "Bottom temp: " + r.v.toFixed(1) + "K  ";
        
      r = readout["uB_Cryo_IFIX_1_0/LT122"];
      if(r) {
          // val is differential pressure between bottom and top in psi
          var level = -191; // bottom of the hull
          var cm_of_ar = ((r.v-13.3)*6894.757293/100./100./9.8*1000./1.4) + 9.5*2.54;
          gLevel = level + cm_of_ar ; // Convert to cm.
          txt += "<br>" + "Fill: &Delta;P=" + r.v.toFixed(1) + " psi &rightarrow; " + cm_of_ar.toFixed(1) + " cm Ar";
          txt += "<br><span class='smaller'> as of " + r.d + " " +  r.t + "<span>";
      }
      $("#readings").html(txt);
      gFillLevel.Rebuild();
      
      // var output = val.split(' ');
      // var variable = output[0];
      // var d = output[1];
      // var t = output[2]
      // var number = output[3] + units;
      // $('#big').text(number);
      //  //      var d = new Date;
      // $('#small').html( variable + "<br/>" + d + " " + t );
    }
  });
  
  gFillLevel.Rebuild();
}




// Subclass of Pad3d.
FillLevel.prototype = new Pad3d;           
FillLevel.prototype.constructor = FillLevel;

function FillLevel( element, options ){
  // console.log('TriDView ctor');
  if(!element) {
    // console.log("TriDView: NULL element supplied.");
    return;
  }
  if($(element).length<1) { 
    // console.log()
    return;   
  }
  
  var settings = {
    default_look_at:    [0,0,0],
    default_camera_distance: 800,
    camera_distance_max: 8000,
    camera_distance_min: 50,
    default_theta: -0.1,
    default_phi: 0.5,
    bg_color: "#F0F0F0"
  }
  $.extend(true,settings,options);  // Change default settings by provided qualities.
  Pad3d.call(this, element, settings); // Give settings to Pad contructor.
  this.ResetView();
  this.gSetupDirty = true;
  
}

var twopi = 2*Math.PI;


FillLevel.prototype.Rebuild = function()
{ 
  // TPC 
  var dx = 128.175;
  var dy = 116.5; // half-length
  var dz = 518.4;
  
  // Cryostat Tube
  var tubeL = 1086.49;
  var tubeR = 191.61;
  
  // Cryostat Endcap;
  var endcapR = 305.250694957859;
  var endcapCenterZ = 305.624305042141;
  
  
  if(this.gSetupDirty) {
    this.gSetupDirty = false;
    // Draw the scenery elements.
    this.objects = [];
    // console.log("TriDView CreateFrame.");
  
    /// Simple frame.
    // console.log("Creating frame");


  
    // All coords are in cm.
    // var curColor = "rgba(50, 50, 255, 1)";
    // var curColor = "rgba(50,250,50 1)";
    var curColor = "green";
    this.AddSegmentedLine( -dx, -dy, -dz,  dx,-dy, -dz,   5, 3, curColor);
    this.AddSegmentedLine( dx,-dy, -dz,  dx, dy, -dz,   5, 3, curColor);
    this.AddSegmentedLine( dx, dy,-dz,  -dx ,  dy, -dz,   5, 3, curColor);
    this.AddSegmentedLine( -dx ,-dy, -dz,  -dx , dy, -dz,   5, 3, curColor);

    this.AddSegmentedLine( -dx, -dy, dz,  dx,-dy, dz, 5, 3, curColor);
    this.AddSegmentedLine( dx,-dy, dz,  dx, dy, dz, 5, 3, curColor);
    this.AddSegmentedLine( dx, dy,dz,   -dx , dy, dz, 5, 3, curColor);
    this.AddSegmentedLine( -dx ,-dy, dz,  -dx , dy, dz, 5, 3, curColor);

    this.AddSegmentedLine( -dx,-dy, -dz ,  -dx ,-dy, dz,  10, 3, curColor);
    this.AddSegmentedLine(dx,-dy, -dz , dx ,-dy, dz,  10, 3, curColor);
    this.AddSegmentedLine( -dx, dy, -dz ,  -dx , dy, dz,  10, 3, curColor);
    this.AddSegmentedLine(dx, dy, -dz ,  dx, dy, dz,  10, 3, curColor);


    // Cryostat Tube
    var tubeL = 1086.49;
    var tubeR = 191.61;
    for(z = -tubeL/2; z<= 1.01*tubeL/2; z+= tubeL/8) {
      this.AddArcXY(0,0,z, 
                    tubeR,
                    50,
                    0, Math.PI*2,1,curColor,hov);
    }
    
    // Cryostat Endcap;
    var endcapR = 305.250694957859;
    var endcapCenterZ = 305.624305042141;
    for(var end=-1; end<=1; end+=2) {  
      var ncirc = 3;
      for(var theta = 0.01; theta< 6.78612527817496147e-01; theta+=Math.PI/17.){
        var r = (endcapR)*Math.sin(theta);
        var z = end* (endcapCenterZ + (endcapR)*Math.cos(theta));
        this.AddArcXY(0,0,z, 
                      r,
                      30,
                      0, Math.PI*2,1,curColor,hov);
      }
    }

    // Optical detectors.
    var dets = gGeo.opDets.opticalDetectors;
    this.ctx.strokeStyle = "black";
    for(var i=0;i<32;i++){
      var det = dets[i];
      var hov = {obj: det, type: "opdet", collection: gGeo.opDets.opticalDetectors};

      this.AddArcYZ(det.x-dx,det.y,det.z-dz,15.2,20,0,Math.PI*2,1,curColor,hov);
    }
    
    
    // for(var phi = -phi1; phi<=phi1; phi += phi1/10 ) {
    //   this.AddLine(x1, y, z1, x1, y, z2,  4, curColor);
    //
    // }
    
    
      
    this.scenery_objects = this.objects.slice(0); // make a copy
  } else {
    this.objects = this.scenery_objects.slice(0); // copy back.
  }

  // gLevel = -100.;
  // Water level.
  var curColor = "blue";
  // position around main tube
  var x1 = Math.sqrt(tubeR*tubeR - gLevel*gLevel);
  var x2 = -x1;
  var y = gLevel;
  var z1= -tubeL/2;
  var z2 = tubeL/2;
  // Fixme: break into segments.
  this.AddSegmentedLine(x1, y, z1, x1, y, z2, 8, 4, curColor);
  this.AddSegmentedLine(x2, y, z1, x2, y, z2, 9, 4, curColor);
  
  // Wavy lines.
  this.AddWave(tubeL/5, {x:0,y:5,z:0}, {x:x1,y:y,z:z1}, {x:x1, y:y, z:z2}, 2, curColor, hov);
  this.AddWave(tubeL/5, {x:0,y:5,z:0}, {x:x2,y:y,z:z1}, {x:x2, y:y, z:z2}, 2, curColor, hov);
  var x3 = x1/2;
  var x4 = x2/2;
  this.AddWave(tubeL/5, {x:5,y:5,z:0},  {x:x3,y:y,z:z1-10}, {x:x3, y:y, z:z2+10}, 2, curColor, hov);
  this.AddWave(tubeL/5, {x:-5,y:5,z:0}, {x:x4,y:y,z:z1-10}, {x:x4, y:y, z:z2+10}, 2, curColor, hov);
  this.AddWave(tubeL/5, {x:0,y:5,z:0},  {x: 0,y:y,z:z1-20}, {x: 0, y:y, z:z2+20}, 2, curColor, hov);
  
  
  // Around the shere
  var waterlineR = Math.sqrt(endcapR*endcapR - gLevel*gLevel);
  var phi1 = Math.PI/2 - Math.asin((tubeL/2-endcapCenterZ)/waterlineR);
  this.AddArcXZ(0,gLevel,endcapCenterZ, waterlineR, 20, -phi1+Math.PI/2, phi1+Math.PI/2, 3, curColor, hov);
  this.AddArcXZ(0,gLevel,-endcapCenterZ, waterlineR, 20, -phi1-Math.PI/2, phi1-Math.PI/2, 3, curColor, hov);
  

  this.Draw();
}

FillLevel.prototype.AddWave = function( wavelength, polarization, p1, p2, width, color, obj ) 
{
  // console.log(wavelength,phase,polarization,from_z,to_z);
  var dx = p2.x - p1.x;
  var dy = p2.y - p1.y;
  var dz = p2.z - p1.z;
  
  var l = Math.sqrt(dx*dx + dy*dy + dz*dz);
  var n = Math.ceil(l/wavelength*10);

  var last_x = p1.x;
  var last_y = p1.y;
  var last_z = p1.z;
  for(var i=1;i<=n;i++) {
    // Nominal line coords:
    var f = i/n;
    var cx = p1.x + dx*f;
    var cy = p1.y + dy*f;
    var cz = p1.z + dz*f;
    var E = Math.sin(2*Math.PI*f*l/wavelength);
    var x = cx + E*polarization.x;
    var y = cy + E*polarization.y;
    var z = cz + E*polarization.z;
    
    this.AddLine(last_x,last_y,last_z, x,y,z, width, color, obj );
    last_x = x;
    last_y = y;
    last_z = z;
  }
}

