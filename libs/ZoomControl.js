
// Automatic runtime configuration.
// I should probably abstract this another level for a desktop-like build...

$(function(){
  $('div.A-ZoomControl').each(function(){
    var o = new ZoomControl(this);
  });  
});


// Subclass of Pad.
ZoomControl.prototype = new Pad;           
ZoomControl.prototype.constructor = Pad;

// Global
gZoomControl = null;
gZoomRegion = new ZoomRegion();

function ZoomRegion() {
  this.plane= [  [ gGeo.numWires(0)/2-250, gGeo.numWires(0)/2+250 ],
                 [ gGeo.numWires(1)/2-250, gGeo.numWires(1)/2+250 ],
                 [ gGeo.numWires(2)/2-250, gGeo.numWires(2)/2+250 ] ];

                 
  this.copy = function() {
    return $.extend(true,{},this);
  }
  
  this.getCenter = function(){
    return [ (this.plane[0][0]+this.plane[0][1])/2. ,
             (this.plane[1][0]+this.plane[1][1])/2. ,
             (this.plane[2][0]+this.plane[2][1])/2. ];
  }

   
  this.getDWire = function(plane,deltaWire){
    var dwire = [0,0,0];
    switch(plane) {
      case 0: dwire = [ deltaWire        ,-deltaWire*kcos60, deltaWire*kcos60 ]; break;
      case 1: dwire = [-deltaWire*kcos60 , deltaWire       , deltaWire*kcos60 ]; break;
      case 2: dwire = [ deltaWire*kcos60 , deltaWire*kcos60, deltaWire        ]; break;
    }
    return dwire;
  }

  this.moveZoomCenter = function(plane,deltaWire)
  {
    var dwire = this.getDWire(plane,deltaWire);
    for(var ip=0;ip<3;ip++) {
      for(var il=0;il<2;il++) this.plane[ip][il]+=dwire[ip];
    }
  }
  
  this.setLimits = function(plane,wireLow,wireHigh)
  {
    // Jump to a new set of coordinates.
    var oldCenter = this.getCenter();
    var halfWidth = (wireHigh - wireLow)/2;
    var newWire = (wireHigh+wireLow)/2.;  
    var dcenter = this.getDWire(plane,newWire-oldCenter[plane]);
    
    for(var ip=0;ip<3;ip++) {
      this.plane[ip][0] = oldCenter[ip]+dcenter[ip] - halfWidth;
      this.plane[ip][1] = oldCenter[ip]+dcenter[ip] + halfWidth;
    }
  }
  
  
};  


function ZoomControl( element, options )
{
  if(element === undefined) return; // null function call.
  gZoomControl = this;
  
  var settings = {
    margin_bottom : 2,
    margin_top    : 2,
    margin_right  : 2,
    margin_left   : 2,
    // buttress_min_u :     0,    // cm
    // buttress_max_u :  1040,
    // buttress_min_v :  -120,
    // buttress_max_v :   120,
    buttress_min_u :     -50,    // cm
    buttress_max_u :  1090,
    buttress_min_v :  -150,
    buttress_max_v :   150,
    min_u :     -50,    // cm
    max_u :  1090,
    min_v :  -150,
    max_v :   150,
    draw_frame:false
  };
  $.extend(true,settings,options);  // Change default settings by provided qualities.
  Pad.call(this, element, settings); // Give settings to Pad contructor.
  
  var self = this;
  this.fMousing = false; // Mouse is in our region.
  this.fDragging = false; // Mouse is moving zoom region
  this.fPulling  = false; // Mouse is changing size of zoome region
  this.fMousedWires = [];
  
  $(this.element).bind('mousemove',function(ev) { return self.DoMouse(ev); });
  $(this.element).bind('mousedown',function(ev) { return self.DoMouse(ev); });
  $(window      ).bind('mouseup',function(ev) { return self.DoMouse(ev); });
  $(this.element).bind('mouseout' ,function(ev) { return self.DoMouse(ev); });

  $(this.element).bind('touchstart' ,function(ev) { return self.DoMouse(ev); });
  $(this.element).bind('touchmove' ,function(ev) {  return self.DoMouse(ev); });
  $(this.element).bind('touchend' ,function(ev) { return self.DoMouse(ev); });
 
  gStateMachine.BindObj('recordChange',this,"NewRecord");
  gStateMachine.BindObj('zoomChange',this,"Draw");
  gStateMachine.BindObj('zoomChangeFast',this,"Draw");
  
}

ZoomControl.prototype.Resize = function()
{
  // This pad is a special case: we want to preseve x/y proportionality after a resize.

  // First, call the standard function.
  Pad.prototype.Resize.call(this)

  // Our ideal aspect ratio (height/width) is
  var ideal_aspect_ratio = (this.buttress_max_v - this.buttress_min_v) 
                         / (this.buttress_max_u - this.buttress_min_u);
  // Now insist that the smaller dimention conform. 
  var aspect_ratio = this.span_y/this.span_x;
  
  
  if(aspect_ratio > ideal_aspect_ratio) {
    // More constrained in x  
    this.min_u = this.buttress_min_u;
    this.max_u = this.buttress_max_u;
    var span = (this.buttress_max_u-this.buttress_min_u)*aspect_ratio;
    var padding = (span-(this.buttress_max_v-this.buttress_min_v))/2.
    this.min_v = this.buttress_min_v - padding; 
    this.max_v = this.buttress_max_v + padding; 
  } else {
    // More constrained in y    
    this.min_v = this.buttress_min_v;
    this.max_v = this.buttress_max_v;
    var span = (this.buttress_max_v-this.buttress_min_v)/aspect_ratio;
    var padding = (span-(this.buttress_max_u-this.buttress_min_u))/2.
    this.min_u = this.buttress_min_u - padding; 
    this.max_u = this.buttress_max_u + padding; 
  }
  // console.log("ZoomControl.Resize",aspect_ratio,this.min_u,this.max_u,this.min_v,this.max_v);
}


ZoomControl.prototype.AutoZoom = function()
{
  var source = gRecord.cal;
  if(!source) source = gRecord.raw;
  if(!source) return;
  
  if(source.timeHist){
    var timeHist = $.extend(true,new Histogram(1,0,1), source.timeHist);
    var time_bounds = timeHist.GetROI(0.01);
    gTimeCut[0] = time_bounds[0]-20;
    gTimeCut[1] = time_bounds[1]+20;  
  } else {
    gTimeCut[0] = 0;
    gTimeCut[1] = 3200;
  }
  
  if(source.planeHists) {
    var plane0Hist = $.extend(true,new Histogram(1,0,1), source.planeHists[0]);
    var plane0_bounds = plane0Hist.GetROI(0.01);
    gZoomRegion.setLimits(0,plane0_bounds[0],plane0_bounds[1]);

    var plane1Hist = $.extend(true,new Histogram(1,0,1), source.planeHists[1]);
    var plane1_bounds = plane1Hist.GetROI(0.01);
    gZoomRegion.setLimits(0,plane1_bounds[0],plane1_bounds[1]);

    var plane2Hist = $.extend(true,new Histogram(1,0,1), source.planeHists[2]);
    var plane2_bounds = plane2Hist.GetROI(0.01);
    // Add 10 wires to either side.
    gZoomRegion.setLimits(2,plane2_bounds[0]-10,plane2_bounds[1]+10);
  } else {
    gZoomRegion.setLimits(2,0,3456);
  };
  
  gStateMachine.Trigger("zoomChange");
}

ZoomControl.prototype.NewRecord = function()
{
  this.AutoZoom();
}


ZoomControl.prototype.Draw = function()
{  
  this.Clear();
  // this.DrawFrame();
  var x1 = this.GetX(0);
  var x2 = this.GetX(1040);
  var y1 = this.GetY(-118);
  var y2 = this.GetY(118);
  this.ctx.fillStyle = "rgba(0,0,0,0.2)";
  this.ctx.strokeStyle = "rgba(0,0,0,1)";
  this.ctx.beginPath();
  this.ctx.moveTo(x1,y1);
  this.ctx.lineTo(x1,y2);
  this.ctx.lineTo(x2,y2);
  this.ctx.lineTo(x2,y1);
  this.ctx.lineTo(x1,y1);
  this.ctx.stroke();
  
  // Draw some wires.
  for(var plane=0;plane<3;plane++) {
    switch(plane) {
      case 0:     this.ctx.strokeStyle = "rgb(255,0,0)"; break;
      case 1:     this.ctx.strokeStyle = "rgb(0,255,0)"; break;
      case 2:     this.ctx.strokeStyle = "rgb(0,0,255)"; break;

    }
    this.ctx.save();
    for(var wire=0;wire<gGeo.numWires(plane);wire+=100) {
      var geowire = gGeo.getWire(plane,wire);
      this.ctx.lineWidth=0.2;
      this.ctx.beginPath();
      this.ctx.moveTo(this.GetX(geowire.z1), this.GetY(geowire.y1));
      this.ctx.lineTo(this.GetX(geowire.z2), this.GetY(geowire.y2));
      this.ctx.stroke();
    }
    this.ctx.restore();
  }
  
  // Draw the zoom region.
  // First, do some semi-transparent boxes.
  
  // Clip to the actual view area.
  this.ctx.save();
  this.ctx.beginPath();
  this.ctx.moveTo(x1,y1);
  this.ctx.lineTo(x1,y2);
  this.ctx.lineTo(x2,y2);
  this.ctx.lineTo(x2,y1);
  this.ctx.lineTo(x1,y1);
  this.ctx.clip();
  
  for(var plane=0;plane<3;plane++) {
    switch(plane) {
      case 0:     this.ctx.fillStyle = "rgba(255,0,0,0.5)"; break;
      case 1:     this.ctx.fillStyle = "rgba(0,255,0,0.5)"; break;
      case 2:     this.ctx.fillStyle = "rgba(0,0,255,0.5)"; break;
    }
    var minwire = gGeo.getWire(plane,gZoomRegion.plane[plane][0]);
    var maxwire = gGeo.getWire(plane,gZoomRegion.plane[plane][1]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.GetX(minwire.z1), this.GetY(minwire.y1));
    this.ctx.lineTo(this.GetX(minwire.z2), this.GetY(minwire.y2));

    // Fill in corners.
    if(plane==0)
     this.ctx.lineTo(this.GetX(maxwire.z2), this.GetY(minwire.y2));
    if(plane==1)
     this.ctx.lineTo(this.GetX(minwire.z2), this.GetY(maxwire.y2));

    this.ctx.lineTo(this.GetX(maxwire.z2), this.GetY(maxwire.y2));
    this.ctx.lineTo(this.GetX(maxwire.z1), this.GetY(maxwire.y1));
    
    // Fill in corners.
    if(plane==0)
     this.ctx.lineTo(this.GetX(minwire.z1), this.GetY(maxwire.y1));
    if(plane==1)
     this.ctx.lineTo(this.GetX(maxwire.z1), this.GetY(minwire.y1));
    
    this.ctx.fill();
  }
  this.ctx.restore();
  
  if(this.fMousing)
  for(var plane=0;plane<3;plane++) {
    switch(plane) {
      case 0:     this.ctx.strokeStyle = "rgba(255,0,0,1)"; break;
      case 1:     this.ctx.strokeStyle = "rgba(0,255,0,1)"; break;
      case 2:     this.ctx.strokeStyle = "rgba(0,0,255,1)"; break;
    }
    var geowire = gGeo.getWire(plane,this.fMousedWires[plane]);
    this.ctx.beginPath();
    this.ctx.moveTo(this.GetX(geowire.z1), this.GetY(geowire.y1));
    this.ctx.lineTo(this.GetX(geowire.z2), this.GetY(geowire.y2));
    this.ctx.stroke();
  }
  
  var txt = Math.round(gZoomRegion.plane[0][0]) + "-" + Math.round(gZoomRegion.plane[0][1]) + "  /  "
          + Math.round(gZoomRegion.plane[1][0]) + "-" + Math.round(gZoomRegion.plane[1][1]) + "  /  "
          + Math.round(gZoomRegion.plane[2][0]) + "-" + Math.round(gZoomRegion.plane[2][1]) ;
        
  $('span.ZoomControl-Info').text(txt);
  
}

ZoomControl.prototype.DoMouse = function(ev)
{
  ev.originalEvent.preventDefault();
  
  
  if(ev.type === 'mouseout' || ev.type == 'touchend') {
    this.fMousing = false;
    this.fMousedWires = [];

    this.canvas.style.cursor="auto";
    document.onselectstart = null;  // Keep stupid I-bar from appearing on drag.
    // TODO: clear hovered objects

  } else  if (ev.type === 'mouseup') {
    if(this.fPulling)        gStateMachine.Trigger("zoomChange");
    if(this.fDragging)       gStateMachine.Trigger("zoomChange");

    this.fPulling = false;
    this.fDragging = false;
    // Finish the range change.
  } else {
    this.fMousing = true; // mouse is inside canvas.
    document.onselectstart = function(){ return false; }// Keep stupid I-bar from appearing on drag.
    
    var offset = getAbsolutePosition(this.canvas);
    this.fMouseX = ev.pageX - offset.x;
    this.fMouseY = ev.pageY - offset.y; 
    this.fMouseU = this.GetU(this.fMouseX);
    this.fMouseV = this.GetV(this.fMouseY);

    // Exact mouse location, in wire space
    // Find moused wires.
    this.fMousedWires = [];
    for(var plane = 0; plane<3; plane++) {
      this.fMousedWires[plane] = gGeo.yzToWire(plane,this.fMouseV,this.fMouseU);
      
      if(this.fMousedWires[plane]<0) this.fMousedWires[plane] = 0;
      if(this.fMousedWires[plane] >= gGeo.numWires(plane)-1) this.fMousedWires[plane] = gGeo.numWires(plane)-1;
    }

    var lineHover = null;
    var inside_hex = false;

    if(this.fDragging == false && this.fPulling == false) {
      inside_hex = true;
      for(var plane=0;plane<3;plane++) {
        var gwires = [];
        for(var iminmax=0;iminmax<2;iminmax++) {
          var gwire = gGeo.getWire(plane,gZoomRegion.plane[plane][iminmax]);
          gwires[iminmax] = Math.round(gwire);
          
          // Is the mouse near one of these wires?
          var dist_to_line = GeoUtils.line_to_point(this.fMouseX,this.fMouseY,
              this.GetX(gwire.z1),this.GetY(gwire.y1),
              this.GetX(gwire.z2),this.GetY(gwire.y2));
          if (dist_to_line < 4) { lineHover = {plane: plane, wire: gZoomRegion.plane[plane][iminmax], minmax: iminmax};}
          // is point inside polygon?
        }
        
        // var inside = GeoUtils.is_point_in_polygon([this.fMouseU,this.fMouseV]
        //           ,[ [gwires[0].z1,gwires[0].y1]
        //            , [gwires[0].z2,gwires[0].y2]
        //            , [gwires[1].z2,gwires[1].y2]
        //            , [gwires[1].z1,gwires[1].y1]
        //            ]);
        // if(!inside) inside_hex = false;
        
        inside_hex = false;
        if( (gZoomRegion.plane[0][0] < this.fMousedWires[0]) && (this.fMousedWires[0] < gZoomRegion.plane[0][1])
        &&  (gZoomRegion.plane[1][0] < this.fMousedWires[1]) && (this.fMousedWires[1] < gZoomRegion.plane[1][1])
        &&  (gZoomRegion.plane[2][0] < this.fMousedWires[2]) && (this.fMousedWires[2] < gZoomRegion.plane[2][1]) )
          inside_hex = true;
        
      
      }
      // Set cursor as required.
      if(lineHover) {
        switch(lineHover.plane) {
          case 0:       this.canvas.style.cursor = "nwse-resize"; break;
          case 1:       this.canvas.style.cursor = "nesw-resize"; break;
          case 2:       this.canvas.style.cursor = "ew-resize"; break;
        }
      } else if(inside_hex) {
        this.canvas.style.cursor = "move";
      } else {
        this.canvas.style.cursor = "auto";
      }
    }
    
    
    if(ev.type === 'mousedown') {
      if(lineHover) {
        // start move bound(s)
        this.fPulling = true;
        this.fPullWire = lineHover;
        this.fPullStartWires = $.extend(true,{},this.fMousedWires);
        this.fPullStartZoom = $.extend(true,{},gZoomRegion);
      } else if(inside_hex) {
        // start move zoom center
        this.fDragging = true;
        this.fDragStartMouse = [this.fMouseU, this.fMouseV];
        this.fDragStartWires = $.extend(true,{},this.fMousedWires);
        this.fDragStartZoom = $.extend(true,{},gZoomRegion);
      }
    }
    if(ev.type === 'mousemove'){
      if(this.fPulling) {
        // Pull the edges of the zoom region
        var pullplane = this.fPullWire.plane;
        var delta_wire = this.fMousedWires[pullplane] - this.fPullStartWires[pullplane];
        if(this.fPullWire.minmax>0) delta_wire = -delta_wire;
        var old_width = this.fPullStartZoom.plane[pullplane][1] - this.fPullStartZoom.plane[pullplane][0];
        var new_width = old_width - 2*delta_wire;
        var min_width = 20;
        if(new_width < min_width) delta_wire = (old_width-min_width)/2; // Set limit: no narrower than 20 wires.
        for(var plane=0;plane<3;plane++) {
          gZoomRegion.plane[plane][0] = this.fPullStartZoom.plane[plane][0] + delta_wire;          
          gZoomRegion.plane[plane][1] = this.fPullStartZoom.plane[plane][1] - delta_wire;          
        }
        gStateMachine.Trigger("zoomChangeFast"); // Live zooming doesn't work well.
        
              
      } else if(this.fDragging) {
        // Drag the zoom region
        for(var plane=0;plane<3;plane++) {
          var delta_wire = this.fMousedWires[plane] - this.fDragStartWires[plane];
          gZoomRegion.plane[plane][0] = this.fDragStartZoom.plane[plane][0] + delta_wire;
          gZoomRegion.plane[plane][1] = this.fDragStartZoom.plane[plane][1] + delta_wire;
        }
        gStateMachine.Trigger("zoomChangeFast");
      }
    }
  }
  this.Draw();
  
  
}