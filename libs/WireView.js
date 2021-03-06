//
// Code for the ARgo Event Display
// Author: Nathaniel Tagg ntagg@otterbein.edu
// 
// Licence: this code is free for non-commertial use. Note other licences may apply to 3rd-party code.
// Any use of this code must include attribution to Nathaniel Tagg at Otterbein University, but otherwise 
// you're free to modify and use it as you like.
//

///
/// Boilerplate:  Javascript utilities for MINERvA event display, codenamed "Argo"
/// Nathaniel Tagg  - NTagg@otterbein.edu - June 2009
///


//
// 'Main' scripts for argo.html
// Used to be in 'head', but it was too unwieldly.
//
/*jshint laxcomma:true */

// Subclass of Pad.
WireView.prototype = new Pad();

gWireViews = [];
// Automatic runtime configuration.
// I should probably abstract this another level for a desktop-like build...
$(function(){
  $('div.A-WireView').each(function(){
    var o = new WireView(this);
    gWireViews.push(o);
    // console.log("Creating WireView ",o);
  });  
});


/// Utility function: ClosestMatch
/// Find a DOM element matching the selector that has the closest common ancestor
/// to the given element.



function WireView( element, options )
{
  if(!element) {
    return;
  }
  if($(element).length<1) { 
    return;
  }
  
  // console.warn("WireView created with element:",$(element).css("height"),$(element).height());
  
  var settings = {
    nlayers: 1,
    plane: 0, // default, override this
    margin_bottom : 40,
    margin_top    : 5,
    margin_right  : 5,
    margin_left   : 30,
    xlabel : "Wire",
    ylabel : "TDC",
    zooming: true, // set false to lock view on starting coordinates
    tick_pixels_x: 50,
    tick_pixels_y: 30,
    tick_label_font: "10px serif",
    show_image:   false, // can be false, 'raw', or 'cal'
    show_hits:    false,
    show_mc:      true
  };
  $.extend(true,settings,options);  // Change default settings by provided qualities.
  Pad.call(this, element, settings); // Give settings to Pad contructor.
  // console.warn("WireView created with element:",$(element).css("height"),$(element).height());
  
  var self = this;
  this.SetMagnify(true);
  this.fMouseStart  = {}; this.fMouseLast = {};
  this.fDragging = false;
  this.fShiftSelecting = false;
  this.fShiftRect = {};
  this.hasContent = false;
  this.myHits = [];
  this.visHits = [];
  
  this.mouseable = [];
  
  this.loaded_wireimg = false;
  this.loaded_thumbnail = false;
  $(this.canvas).css('image-rendering','pixelated');
  
  // $(this.element).bind('mousemove',function(ev) { return self.DoMouse(ev); });
  // $(this.element).bind('mousedown',function(ev) { return self.DoMouse(ev); });
  // $(this.element).bind('mouseout' ,function(ev) { return self.DoMouse(ev); });
  // $(document    ).bind('mouseup' ,function(ev) { return self.DoMouse(ev); });
  // 
  // $(this.element).bind('touchstart' ,function(ev) { return self.DoMouse(ev); });
  // $(this.element).bind('touchmove' ,function(ev) {  return self.DoMouse(ev); });
  // $(this.element).bind('touchend' ,function(ev) { return self.DoMouse(ev); });

  // $(this.element).bind('resize' ,function(ev) { if(self.hasContent == false) self.Draw(); });
  
    
  gStateMachine.Bind('recordChange', this.NewRecord.bind(this) );
  gStateMachine.Bind('TimeCutChange',this.Draw.bind(this) );
  gStateMachine.Bind('hoverChange',  this.HoverChange.bind(this) );
  gStateMachine.Bind('selectChange', this.Draw.bind(this) );
  gStateMachine.Bind('hitChange',    this.TrimHits.bind(this) );
  gStateMachine.Bind('timeCutChange',this.TrimHits.bind(this) );
  
  gStateMachine.BindObj("colorWireMapsChanged",this,"Draw"); // Callback when wire image loads
  if(this.zooming) gStateMachine.BindObj('zoomChange',this,"Draw");
  if(this.zooming) gStateMachine.BindObj('zoomChangeFast',this,"DrawFast");
 
  this.ctl_show_hits    =  GetBestControl(this.element,".show-hits");
  this.ctl_hit_field    =  GetBestControl(this.element,".hit-hist-field");
  this.ctl_show_wireimg =  GetBestControl(this.element,".show-wireimg");
  this.ctl_show_clus    =  GetBestControl(this.element,".show-clus");
  this.ctl_show_endpoint=  GetBestControl(this.element,".show-endpoint2d");
  this.ctl_show_spoints =  GetBestControl(this.element,".show-spoints");
  this.ctl_show_tracks  =  GetBestControl(this.element,".show-tracks");
  this.ctl_track_shift  =  GetBestControl(this.element,".track-shift-window");
  this.ctl_show_showers =  GetBestControl(this.element,".show-showers");
  this.ctl_show_mc      =  GetBestControl(this.element,".show-mc");
  this.ctl_show_mc_neutrals =  GetBestControl(this.element,".show-mc-neutrals");
  this.ctl_mc_move_tzero    =  GetBestControl(this.element,".ctl-mc-move-tzero");
  this.ctl_show_reco =  GetBestControl(this.element,".show-reco");
  this.ctl_wireimg_type =  GetBestControl(this.element,"[name=show-wireimg-type]");
  this.ctl_dedx_path    =  GetBestControl(this.element,".dEdX-Path");

  $(this.ctl_show_hits   ).change(function(ev) { return self.Draw(false); });
  $(this.ctl_show_wireimg).change(function(ev) { return self.Draw(false); });
  $(this.ctl_show_clus)   .change(function(ev) { return self.Draw(false); });
  $(this.ctl_show_endpoint).change(function(ev) { return self.Draw(false); });

  $(this.ctl_show_spoints).change(function(ev) { return self.Draw(false); });
  $(this.ctl_show_tracks) .change(function(ev) { return self.Draw(false); });
  $(this.ctl_show_showers).change(function(ev) { return self.Draw(false); });
  $(this.ctl_track_shift) .change(function(ev) { return self.Draw(false); });
  $(this.ctl_show_mc     ).change(function(ev) { return self.Draw(false); });
  $(this.ctl_show_mc_neutrals ).change(function(ev) { return self.Draw(false); });
  $(this.ctl_mc_move_tzero ).change(function(ev) { return self.Draw(false); });
  $(this.ctl_show_reco ).change(function(ev) { return self.Draw(false); });
  $(this.ctl_wireimg_type).click(function(ev)  { return self.NewRecord(); });
  $('#ctl-TrackLists')      .change(function(ev) { return self.Draw(false); });
  $('#ctl-ShowerLists')      .change(function(ev) { return self.Draw(false); });
  $('#ctl-SpacepointLists') .change(function(ev) { return self.Draw(false); });
  $('#ctl-HitLists'    ) .change(function(ev) { return self.NewRecord_hits(); });
  $('#ctl-ClusterLists') .change(function(ev) { return self.Draw(false); });
  $(this.ctl_dedx_path)     .change(function(ev) { return self.Draw(false); });
  $(GetBestControl(this.element),".show-reco")     .change(function(ev) { return self.Draw(false); });
  
  // Flip planes control (for big wireview
  this.ctl_plane = GetLocalControl(this.element,"[name=wireview-select]");
  this.ctl_plane.click(function(ev) { 
    self.plane = parseInt( $(self.ctl_plane).filter(":checked").val() );
    // console.warn("changing plane",self,$(this.ctl_plane).filter(":checked").val(),self.plane);
    
    return self.NewRecord(); 
  });
}

WireView.prototype.HoverChange = function()
{
  // Only need a redraw if the over change affected something we care about.
  // console.warn("WireView checking hoverchange",gHoverState.type,gLastHoverState.type);
  switch(gHoverState.type) {
    case "hit": 
    case "endpoint2d": 
    case "cluster":
    case "spacepoint":
    case "track":
    case "mcparticle":
      this.Draw(); return;
    default: break;
  }
  switch(gLastHoverState.type) {
    case "hit": 
    case "endpoint2d": 
    case "cluster":
    case "spacepoint":
    case "track":
    case "mcparticle":
      this.Draw(); return;
    default: break;  
  }
};

WireView.prototype.Resize = function()
{
  Pad.prototype.Resize.call(this);
  gZoomRegion.wireview_aspect_ratio = this.span_y/this.span_x;
};


WireView.prototype.NewRecord = function()
{
  //
  // called on new record available.
  //
  if(!gRecord) return;
  this.NewRecord_hits();
  // this.NewRecord_image();
  this.NewRecord_mc();
};

WireView.prototype.NewRecord_hits = function()
{
  this.myHits = [];
  this.visHits = [];
  this.hasContent = false;

  this.hitsListName = $("#ctl-HitLists").val();
  if(!this.hitsListName) return;
  var hits = gRecord.hits[this.hitsListName];
  // Go through gHits, and find hits that match our view.
  for(var i=0;i<hits.length;i++) {
    if(hits[i].plane == this.plane) this.myHits.push(hits[i]);
  }
  this.TrimHits();
};

// WireView.prototype.NewRecord_image = function()
// {
//   this.loaded_wireimg = false;
//   this.loaded_thumbnail = false;
//
//   this.show_image =  $(this.ctl_wireimg_type).filter(":checked").val();
//
//   if(!gRecord[this.show_image]) return;
//   if(!gRecord[this.show_image][gCurName[this.show_image]]) return;
//
//   // Store the image in the Record.
//   if(!("_wireimage" in gRecord) ) gRecord._wireimage = {};
//
//   // Build offscreen image(s)
//   if(!(this.show_image in gRecord._wireimage)) {
//     gRecord._wireimage[this.show_image] = {};
//     gRecord._wireimage[this.show_image].image   = new Image();
//     gRecord._wireimage[this.show_image].thumb = new Image();
//
//     var wiredesc = gRecord[this.show_image][gCurName[this.show_image]];
//     // e.g. gRecord.raw."recob::rawwire"
//     gRecord._wireimage[this.show_image].image.src = wiredesc.wireimg_url;
//     gRecord._wireimage[this.show_image].thumb.src = wiredesc.wireimg_url_thumb;
//   }
//
//   var self = this;
//   gRecord._wireimage[this.show_image].image.onload = function() {
//       console.log(self.element,"got wireimg");
//       gRecord._wireimage[self.show_image].image_loaded = true;
//       gStateMachine.Trigger("wireImageLoaded");
//   };
//   gRecord._wireimage[this.show_image].thumb.onload = function() {
//       console.log("got wireimg thumb");
//       gRecord._wireimage[self.show_image].thumb_loaded = true;
//   };
// };

WireView.prototype.NewRecord_mc = function()
{
  
};

WireView.prototype.TrimHits = function()
{
  // Called when a cut is changed; go through data and trim visible hit list.
  
  // For now, no cuts, but I am going to add wrapper objects to hold extracted data.
  this.visHits = [];
  var field = $(this.ctl_hit_field).val();
  for(var i = 0;i<this.myHits.length;i++) {
    var h= this.myHits[i];
    var c = h[field];
    if(c<gHitCut.min) {console.warn("trimming low",h); continue;}
    if(c>gHitCut.max) {console.warn("trimming hi ",h); continue;}
    
    var vishit = {hit:h,
      u:h.wire,  // horizontal coord
      v:h.t,     // vertical coord
      v1:h.t1,
      v2:h.t2,
      c: c    // Color coord
    };
    this.visHits.push(vishit);
  }

  this.Draw();
};




WireView.prototype.DrawFast = function()
{
  this.Draw(true);
};

WireView.prototype.DrawOne = function(min_u,max_u,min_v,max_v,fast)
{
  // Reset bounds if appropriate
  if(this.zooming) {
    this.min_v = gZoomRegion.tdc[0];
    this.max_v = gZoomRegion.tdc[1];
    this.min_u = gZoomRegion.plane[this.plane][0];
    this.max_u = gZoomRegion.plane[this.plane][1];
  } else {
    this.min_v = 0;
    this.max_v = 3200;
    this.min_u = 0;
    this.max_u = gGeo.numWires(this.plane);
  }
  
  this.Clear();
  
  this.DrawFrame();
  
  this.DrawScale();

  // Set clipping region for all further calls, just to make things simpler.
  this.ctx.save();
  this.ctx.beginPath();
  this.ctx.moveTo(this.GetX(this.min_u), this.GetY(this.min_v));
  this.ctx.lineTo(this.GetX(this.max_u), this.GetY(this.min_v));
  this.ctx.lineTo(this.GetX(this.max_u), this.GetY(this.max_v));
  this.ctx.lineTo(this.GetX(this.min_u), this.GetY(this.max_v));
  this.ctx.lineTo(this.GetX(this.min_u), this.GetY(this.min_v));
  this.ctx.clip();
  
  this.mouseable = [];
  if(gRecord) {
    if ($(this.ctl_show_wireimg).is(":checked")) {
      this.DrawImage(min_u,max_u, min_v, max_v, fast);
    }

    if ($(this.ctl_show_clus).is(":checked")) {
      this.DrawClusters(min_u,max_u, min_v, max_v, fast);
    }

    if ($(this.ctl_show_hits).is(":checked")) {
      this.DrawHits(min_u,max_u, min_v, max_v, fast);
    }

    if ($(this.ctl_show_endpoint).is(":checked")) {
      this.DrawEndpoint2d();
    }

    if ($(this.ctl_show_spoints).is(":checked")) {
      this.DrawSpacepoints(min_u,max_u, min_v, max_v, fast);
    }

    if ($(this.ctl_show_tracks).is(":checked")) {
      this.DrawTracks(min_u,max_u, min_v, max_v, fast);
    }

    if ($(this.ctl_show_showers).is(":checked")) {
      this.DrawShowers(min_u,max_u, min_v, max_v, fast);
    }

    if ($(this.ctl_show_mc).is(":checked")) {
      this.DrawMC(min_u,max_u, min_v, max_v, fast);
    }  


    if ($(this.ctl_dedx_path).is(":checked")) {
      this.DrawdEdXPath(min_u,max_u, min_v, max_v, fast);
    }

    if(this.fShiftSelecting) {
      this.DrawShiftRect();
    }
    this.DrawMyReco(min_u,max_u, min_v, max_v, fast);
    
  }

  if(this.zooming) {
    // Make black boxes around the data.
    this.ctx.fillStyle = "rgb(0,0,0)";
    var nwires = gGeo.numWires(this.plane);
    if(min_u < 0) 
      this.ctx.fillRect( this.origin_x , this.origin_y-this.span_y, 
                          this.GetX(0) - this.origin_x, this.span_y);

    if(max_u > nwires) {
      var xmax = this.GetX(nwires);
      this.ctx.fillRect( xmax , this.origin_y-this.span_y, 
                        this.span_x /*too much*/, this.span_y);
    }

    if(min_v < 0) {
      this.ctx.fillRect( this.origin_x  , this.GetY(0), 
                        this.span_x, this.span_y /*too much*/);
    }

    if(max_v > 9600) { // FIXME: Should be number of samples.!
      this.ctx.fillRect( this.origin_x , this.origin_y-this.span_y, 
                        this.span_x, this.GetY(9600)-(this.origin_y-this.span_y));
    }
    
    
  }  
  this.ctx.restore();

  // this.ClearOverlays();
  // this.ctxs[1].fillStyle="green";
  // this.ctxs[1].fillRect(0,0,100,100);
};




WireView.prototype.DrawScale = function()
{
  var uspan = (this.max_u-this.min_u);
  // Hardcoded wire pitch.
  var metric_w = (uspan*0.25) * 0.3; // 20% of pad wide, find in mm.
  var ticks = this.GetGoodTicks(0,metric_w,2,false);
  var lasttick = ticks[ticks.length-1];
  var w = lasttick/0.3; // Length of marker line in wires
  
  var u2 = this.max_u - uspan*0.05;
  var u1 = u2-w;
  var x1 = this.GetX(u1);
  var x2 = this.GetX(u2);
  var v  = (this.max_v-this.min_v)*0.95 + this.min_v;
  var y  = this.GetY(v);
  
  this.ctx.save();
  this.ctx.strokeStyle = "black";
  this.ctx.fillStyle = "black";
  this.ctx.moveTo(x1,y); 
  this.ctx.lineTo(x2,y);
  this.ctx.moveTo(x1,y-2);
  this.ctx.lineTo(x1,y+2);
  this.ctx.moveTo(x2,y-2);
  this.ctx.lineTo(x2,y+2);
  this.ctx.stroke();
  this.ctx.font="8px";
  var txt = lasttick + " cm";
  if(lasttick<=0.9) { txt = lasttick*10 + " mm";}
  if(lasttick>=100) { txt = lasttick/100 + " m";}
  this.ctx.textAlign= "center";
  this.ctx.textBaseline = "top";
  this.ctx.fillText(txt,(x1+x2)*0.5, y);
  this.ctx.restore();
};


WireView.prototype.DrawImage = function(min_u,max_u,min_v,max_v,fast)
{
  var do_thumbnail = (fast);
    console.time("DrawImage");

  // look for offscreen canvas.
  this.show_image = $(this.ctl_wireimg_type).filter(":checked").val();
  var objnm = '_' + this.show_image;
  if(!gRecord[objnm]) return; // No such data.
  if(!gRecord[objnm].colored_wire_canvas) return; // No such data.
  var canvas = gRecord[objnm].colored_wire_canvas;

  // FIXME: thumbnails for faster panning.
  
  if(this.max_u<this.min_u) this.max_u = this.min_u; // Trap weird error
   var min_tdc     = Math.max(0,this.min_v);
   var max_tdc     = Math.min(canvas.width,this.max_v); 
   var min_wire    = Math.max(this.min_u,0);
   var max_wire    = Math.min(this.max_u,gGeo.numWires(this.plane));
   var min_channel = gGeo.channelOfWire(this.plane, min_wire);
   var max_channel = gGeo.channelOfWire(this.plane, max_wire);
   
   var source_x = Math.floor(min_tdc);
   var source_y = Math.floor(min_channel);
   var source_w = Math.floor(max_tdc-min_tdc);
   var source_h = Math.floor(max_channel-min_channel);
  
   // Find position and height of destination in screen coordinates. Note we'll 
   // have to rotate these for final picture insertion.
   var dest_x = Math.floor(this.GetX(min_wire));
   var dest_w = Math.floor(this.GetX(max_wire) - dest_x);
   var dest_y = Math.floor(this.GetY(min_tdc));
   var dest_h = Math.floor(dest_y - this.GetY(max_tdc));
  
   // Now, the above values are good, but we need to 
   // rotate our image.
   this.ctx.save();
   this.ctx.translate(dest_x,dest_y);
   this.ctx.rotate(-Math.PI/2);

   var rot_dest_x = 0;
   var rot_dest_y = 0;
   var rot_dest_w = dest_h;
   var rot_dest_h = dest_w;
  
   // console.log("drawImg source",source_x,source_y,source_w,source_h);
   // console.log("drawImg dest", dest_x,   dest_y,  dest_w, dest_h);
   // console.log("drawImg rot ", rot_dest_x,   rot_dest_y,  rot_dest_w, rot_dest_h);
  
  // if(do_thumbnail) {
  //   // Draw from the thumbnail, which is resolution-reduced by a factor of 5.
  //   this.ctx.drawImage(
  //      gRecord._wireimage[this.show_image].thumb      // Source image.
  //     ,source_x/5
  //     ,source_y/5
  //     ,source_w/5
  //     ,source_h/5
  //     ,rot_dest_x
  //     ,rot_dest_y
  //     ,rot_dest_w
  //     ,rot_dest_h
  //      );
  //
  // } else {
    this.ctx.drawImage(
       canvas      // Source image.
      ,source_x
      ,source_y
      ,source_w
      ,source_h
      ,rot_dest_x
      ,rot_dest_y
      ,rot_dest_w
      ,rot_dest_h
    );
    
  // }
  this.ctx.restore();   
  console.timeEnd('DrawImage');
};


WireView.prototype.DrawHits = function(min_u, max_u, min_v, max_v)
{
  // Temp:
  this.cellWidth = this.span_x/this.num_u;
  this.cellHeight = this.span_y/this.num_v;
  
  // console.warn("DrawHits",this.plane,min_u,max_u,min_v,max_v, gHoverState.obj);
  this.fShiftRect.u1 = this.GetU(this.fShiftRect.x1);
  this.fShiftRect.u2 = this.GetU(this.fShiftRect.x2);
  this.fShiftRect.v1 = this.GetV(this.fShiftRect.y2);
  this.fShiftRect.v2 = this.GetV(this.fShiftRect.y1);
  var hoverVisHit = null;
  var h,u,v,x,dx,y,dy,c;
  
  for(var i=0;i<this.visHits.length;i++) {
    h = this.visHits[i];
    u = h.u;
    if(u<min_u) continue;
    if(u>max_u) continue;
    v = h.v;         
    if(v<min_v) continue;
    if(v>max_v) continue;
    x = this.GetX(u);
    dx = this.GetX(u+1) - x;
    
    y = this.GetY(h.v1);
    dy = this.GetY(h.v2) - y;    
    c = gHitColorScaler.GetColor(h.c);

    if(h.hit.saveselection)      c="10,10,10";
    if(this.fShiftSelecting && ((h.u >= this.fShiftRect.u1) && (h.u < this.fShiftRect.u2) && (h.v >= this.fShiftRect.v1) && (h.v < this.fShiftRect.v2))) {
        c="10,10,10";
    }
    
    this.ctx.fillStyle = "rgb(" + c + ")";
    this.ctx.fillRect(x,y,dx,dy);      

  
    if(gHoverState.obj == h.hit) hoverVisHit = h;
    this.mouseable.push({type:"hit", coords:[[x,y],[x,y+dy]], r:dx, obj: h.hit});
  }
  
  if(hoverVisHit) {
    // console.warn("hoverhit!",hoverVisHit);
      h = hoverVisHit;
      u = h.u;
      v = h.v;         
      x = this.GetX(u);
      dx = this.GetX(u) - x;
    
      y = this.GetY(h.v2);
      dy = this.GetY(h.v1) - y;    
      c = gHitColorScaler.GetColor(h.c);
      console.log("color",gHitColorScaler,c);
      this.ctx.fillStyle = "black";

      this.ctx.fillStyle = "rgb(" + c + ")";
      this.ctx.fillRect(x,y,dx,dy);      
      
      // // Hovering this hit.
      this.ctx.strokeStyle = "black";
      var w = 1.5;
      this.ctx.lineWidth = w;
      this.ctx.strokeRect(x-w,y-w,dx+2*w,dy+2*w);          
      
    }
};

WireView.prototype.DrawClusters = function(min_u,max_u,min_v,max_v,fast)
{
  // console.log("DrawClusters");
  if(!gRecord.clusters) return;
  var clustername = $("#ctl-ClusterLists").val();
  var clusters = gRecord.clusters[clustername];
  if(!clusters) return;  

  
  // Find the hits that are associated with this cluster.
  // gRecord.associations.<clustername>.<hitname>[clusid] = [array of hit indices]
  if(!gRecord.associations) {console.err("Can't find associations"); return; }
  var assns = gRecord.associations[clustername];
  var hitname = null;
  for(var name in assns) {
    if( (/^recob::Hits/).test(name) ) { 
      // its a hit list! This is what we want.
      hitname = name; break;
    }
  }
  if(!hitname) return;
  
  var hitassn = assns[hitname];
  var hits = gRecord.hits[hitname];
  // gHitsListName = $("#ctl-HitLists").val();
  // if(gHitsListName) hits = gRecord.hits[gHitsListName];

  this.clusterHulls = [];

  
  clusterLoop:
  for(var i = 0; i<clusters.length;i++) {
    var clus = clusters[i];
    clus._index = i;
    // FIXME: in principle this should work, but it appears the view numbers are actually
    // plane numbers in the early 2013 MC.  So, instead, we'll break out later....
    // if(gGeo.planeOfView(clus.view) != this.plane) continue;

    // console.log(clus.view,"=clus.view",clus.plane,"=clus.plane",this.plane,"=this.plane");
    // console.log(clus.hits[0],clus.hits[1]);
    // console.log(hits[clus.hits[0]].plane,"=first hit plane");
    // console.log(hits[clus.hits[1]].plane,"=first hit plane");
    // if(clus.plane != this.plane) continue;

    // var x1 = this.GetX(clus.startPos.wire);
    // var x2 = this.GetX(clus.endPos  .wire);
    // var y1 = this.GetY(clus.startPos.tdc );
    // var y2 = this.GetY(clus.endPos  .tdc );
    // var cs = new ColorScaleIndexed(clus.ID);
    // this.ctx.fillStyle = "rgba(" + cs.GetColor() + ",0.5)";

    chits = hitassn[i]; // Look up in the association table
    var points = [];
    for(var ihit=0;ihit<chits.length;ihit++) {
      var hid = chits[ihit];
      var h = hits[hid];
      if(h.plane == this.plane) {
        points.push( [ this.GetX(h.wire), this.GetY(h.t) ] );        
      } else {
        continue clusterLoop;  // Give up on this cluster; go to the next one.
      }
    }
    var hull = GeoUtils.convexHull(points);
    var poly = [];
    for(var ihull=0;ihull<hull.length;ihull++) {
      poly.push(hull[ihull][0]);
    }
    
    this.mouseable.push({ obj: clus, type: "cluster", coords: poly });
    
    cs = new ColorScaleIndexed(i+1);    
    this.ctx.fillStyle = "rgba("+cs.GetColor()+", 0.5)";
    this.ctx.beginPath();
    this.ctx.moveTo(poly[poly.length-1][0],poly[poly.length-1][1]);
    for(var ipoly=0;ipoly<poly.length;ipoly++) {
      this.ctx.lineTo(poly[ipoly][0]
                     ,poly[ipoly][1] );
    }
    this.ctx.fill();
    if(gHoverState.obj == clus) {
      this.ctx.fillStyle = "rgba(255, 165, 0, 0.8)";
      this.ctx.strokeStyle = "black";
      this.ctx.stroke();
    }
    
  }
};

WireView.prototype.DrawEndpoint2d = function(min_u,max_u,min_v,max_v,fast)
{
  if(!gRecord.endpoint2d) return;
  var endpoints = gRecord.endpoint2d[$("#ctl-EndpointLists").val()];
  for(var i=0;i<endpoints.length;i++) {
      var pt = endpoints[i];
      pt._index = i;
      if(pt.plane != this.plane) continue;
      
      var u = pt.wire;
      var v = pt.t;
      var x = this.GetX(u);
      var y = this.GetY(v);
      var r = 6;
      this.ctx.fillStyle = "orange";
      this.ctx.beginPath();
      this.ctx.arc(x,y,r,0,1.99*Math.PI);
      this.ctx.closePath();
      this.ctx.fill();
      this.mouseable.push({type:"endpoint2d", coords:[[x,y]], r:r, obj: pt});

      if(gHoverState.obj == pt) {
        console.warn("Endpoint selected",gHoverState.obj);
        this.ctx.fillStyle = "rgba(255, 165, 0, 0.8)";
        this.ctx.strokeStyle = "black";
        this.ctx.linewidth = 3;
        this.ctx.stroke();
      }
  }
};



WireView.prototype.DrawSpacepoints = function(min_u,max_u,min_v,max_v,fast)
{
  if(!$("#ctl-SpacepointLists").val()) return;
  var sps = gRecord.spacepoints[$("#ctl-SpacepointLists").val()];
  if(!sps) return;
  this.ctx.save();
  for(var i = 0; i<sps.length;i++) {
    var sp = sps[i];
    sp._index = i;
    this.ctx.fillStyle = "rgba(0, 150, 150, 1)";
    this.ctx.strokeStyle = "rgba(0, 150, 150, 1)";
    this.ctx.lineWidth = 1;
    var u = gGeo.yzToWire(this.plane,sp.xyz[1],sp.xyz[2]);
    var v = gGeo.getTDCofX(this.plane,sp.xyz[0]); // FIXME: Only true for beam MC events!
    var ru = 1; // one wire.
    // if(i<5) console.warn("spacepoint plane",this.plane,u,v,ru);
    var x = this.GetX(u);
    var y = this.GetY(v);
    var r = this.GetX(u+ru) - x;
    this.ctx.beginPath();
    this.ctx.arc(x,y,r,0,2*Math.PI);
    // if(i<5) console.warn("spacepoint plane",this.plane,x,y,r,0,2*Math.Pi);
    
    if(gHoverState.obj == sp) {
      this.ctx.arc(x,y,r*5,0,2*Math.PI);      
    }
    
    this.ctx.fill();
    if(r>4) this.ctx.strokeStyle="black"; // Dots are big enough that showing the outline is worth it.
    // Accidental visual cleverness: if the radius of the circle is too small to see,
    // this will blow it up to ~2 pixels, the line width of the circle!
    this.ctx.stroke();
    
    
    this.mouseable.push({type:"sp", coords:[[x,y]], r:ru, obj: sp});
    
    
  }
  this.ctx.restore();
};

WireView.prototype.DrawTracks = function(min_u,max_u,min_v,max_v,fast)
{
  var tracklistname = $("#ctl-TrackLists").val();
  if(!tracklistname) return;

  this.offset_track_ticks = 0;
  if($("#ctl-track-shift-window").prop("checked")) this.offset_track_ticks = 3200;

  var bezier = tracklistname.match(/bezier/)!==null;
  if(bezier) { return this.DrawBezierTracks(min_u,max_u,min_v,max_v,fast); }
  var tracks = gRecord.tracks[tracklistname];
  if(!tracks) return;

  this.ctx.save();
  for(var i=0;i<tracks.length;i++)
  {
    var trk = tracks[i];
    trk._index = i;
    var points = trk.points;
    if(points.length<2) continue;
    // compile points
    var pts = [];
    for(var j=0;j<points.length;j++) {
      // Fixme: bezier
      var u = gGeo.yzToWire(this.plane,points[j].y, points[j].z);
      var v = gGeo.getTDCofX(this.plane,points[j].x) + this.offset_track_ticks; // Move it off by 1 frame
      var coords = [this.GetX(u), this.GetY(v)];
      pts.push(coords);      
    }
    
    this.ctx.strokeStyle = "rgba(89, 169, 28, 1)";
    this.ctx.lineWidth = 2;
    
    // Draw underlay
    // Draw underlay for a selected track.
    if(gSelectState.obj && (gSelectState.obj == trk)){      
      if(this.fMouseInContentArea) {
        var offset = getAbsolutePosition(this.canvas);
        var lastpt = pts[pts.length-1];
        SetOverlayPosition(offset.x + lastpt[0], offset.y + lastpt[1]);  
      }

      this.ctx.lineWidth = 5;
      this.ctx.strokeStyle = "rgba(0,0,0,0.8)";
      this.ctx.beginPath();
      this.ctx.moveTo(pts[0][0],pts[0][1]);
      for(j=1;j<pts.length;j++) this.ctx.lineTo(pts[j][0],pts[j][1]);
      this.ctx.stroke();
      this.ctx.lineWidth =2;
      this.ctx.strokeStyle = "rgba(255,20,20,1)";
      
    }
  
    if(gHoverState.obj && (gHoverState.obj == trk)){ // hovering
      this.ctx.strokeStyle = "rgba(255,20,20,1)";
    }
        
    // Draw it.
    this.ctx.beginPath();
    this.ctx.moveTo(pts[0][0],pts[0][1]);
    for(j=1;j<pts.length;j++) this.ctx.lineTo(pts[j][0],pts[j][1]);
    this.ctx.stroke();
    this.ctx.fillStyle=this.ctx.strokeStyle;
    for(j=1;j<pts.length;j++) {
      this.ctx.beginPath();
      this.ctx.arc(pts[j][0],pts[j][1],1.5,0,2*Math.PI,false);
      this.ctx.stroke();
    }

    // for mouseovering
    for(j=1;j<pts.length;j++) 
      this.mouseable.push({type:"track", 
                          coords: [[pts[j-1][0],pts[j-1][1]],
                                   [pts[j][0]  ,pts[j][1]  ] 
                                  ], 
                          r:this.ctx.lineWidth, obj: trk});

    this.ctx.stroke();
  }
  this.ctx.restore();
};

WireView.prototype.DrawShowers = function(min_u,max_u,min_v,max_v,fast)
{
  var showerlistname = $("#ctl-ShowerLists").val();
  if(!showerlistname) return;

  var showers = gRecord.showers[showerlistname];
  if(!showers) return;

  // find gRecord.associations.showername.recob::Hitsthingthing
  var showerass = null;
  var showerhitname = null;
  var hitlist = null
  var hitassn = null
  if(gRecord.associations) showerass = gRecord.associations[showerlistname];
  if(showerass) {
    for( n in showerass ) {
        if( n.indexOf( "::Hits" ) > -1 ) { showerhitname = n; }
      }
    if(showerhitname) {
      hitassn = showerass[n]
      hitlist = gRecord.hits[showerhitname];
    }
  }


  this.ctx.save();
  for(var i=0;i<showers.length;i++)
  {
    var shw = showers[i];
    shw._index = i;


    if(hitlist && hitassn && !shw._hpts ) { shw._hpts = []; }
    if(hitlist && hitassn && !shw._hpts[this.plane] ) {    
      shw._hpts[this.plane] = [];
      for(var ihit=0;ihit<hitassn[shw._index].length;ihit++){
        var hit = hitlist[ hitassn[shw._index][ihit] ];
        if(hit.plane == this.plane) {
          shw._hpts[this.plane].push([hit.wire,hit.t]);
        }
      }
    }

    // Convex hul
    if(hitlist && hitassn && !shw._hull ) { shw._hull =[] };
    if(hitlist && hitassn && !shw._hull[this.plane] ) {
      var pts = [];
      for(var ihit=0;ihit<hitassn[shw._index].length;ihit++){
        var hit = hitlist[ hitassn[shw._index][ihit] ];
        if(hit.plane == this.plane) {
          pts.push([hit.wire,hit.t]);
        }
      }
      shw._hull[this.plane]  = GeoUtils.convexHull(pts);
    }
    
    // Draw hull
    
    // if(shw._hull && shw._hull[this.plane]) {
    //   var hull = shw._hull[this.plane];
    //   this.ctx.beginPath();
    //   this.ctx.moveTo(this.GetX(hull[0][0][0]),this.GetY(hull[0][0][1]));
    //   for(var ipt=1;ipt<hull.length;ipt++) {
    //     this.ctx.lineTo(this.GetX(hull[ipt][1][0]),this.GetY(hull[ipt][1][1]));
    //   }
    //   this.ctx.fillStyle = "rgba(255,92,0,0.5)";
    //   this.ctx.fill();
    // }

    if(shw._hpts && shw._hpts[this.plane]) {
      this.ctx.beginPath();
      var pts = shw._hpts[this.plane];
      for(var ipt=0;ipt<pts.length;ipt++) {
        this.ctx.beginPath();
        this.ctx.arc(this.GetX(pts[ipt][0]),this.GetY(pts[ipt][1]), 4, 0,1.99*Math.PI) ;
        this.ctx.fillStyle = 'orange';
        this.ctx.fill();
      }
    }



    // Draw the vector
    

    var u1 = gGeo.yzToWire(this.plane,  shw.start.y, shw.start.z);
    var v1 = gGeo.getTDCofX(this.plane,shw.start.x) + this.offset_track_ticks;
    var u2 = gGeo.yzToWire(this.plane, shw.Length * shw.dir.y + shw.start.y, 
                                       shw.Length * shw.dir.z + shw.start.z);
    var v2 = gGeo.getTDCofX(this.plane,shw.Length * shw.dir.x + shw.start.x) + this.offset_track_ticks;
    
    var x1 = this.GetX(u1);
    var y1 = this.GetY(v1);
    var x2 = this.GetX(u2);
    var y2 = this.GetY(v2);
    
    this.ctx.strokeStyle = "rgba(255, 28, 28, 1)";
    this.ctx.lineWidth = 2;
    
    // Draw underlay
    // Draw underlay for a selected shower.
    if(gSelectState.obj && (gSelectState.obj == shw)){      
      if(this.fMouseInContentArea) {
        var offset = getAbsolutePosition(this.canvas);
        SetOverlayPosition(offset.x + x2, offset.y + y2);  
      }

      this.ctx.lineWidth = 5;
      this.ctx.strokeStyle = "rgba(0,0,0,0.8)";
      this.ctx.beginPath();
      this.ctx.moveTo(x1,y1);
      this.ctx.lineTo(x2,y2);
      this.ctx.stroke();
      this.ctx.lineWidth =2;
      this.ctx.strokeStyle = "rgba(255,20,20,1)";    
    }
  
    if(gHoverState.obj && (gHoverState.obj == shw)){ // hovering
      this.ctx.strokeStyle = "rgba(255,20,20,1)";
    }
        
    // Draw it.
    this.ctx.beginPath();
    this.ctx.arc(x1,y1,6,0,1.99*Math.PI);
    
    this.ctx.moveTo(x1,y1);
    this.ctx.lineTo(x2,y2);
    this.ctx.stroke();
    

    // for mouseovering
      this.mouseable.push({type:"shower", 
                    coords: [[x1,y1],
                             [x2,y2] 
                            ], 
                    r:this.ctx.lineWidth, obj: shw});


  }
  this.ctx.restore();
};



WireView.prototype.DetectorXyzToScreenXY = function(x,y,z)
{
    return [
      this.GetX( gGeo.yzToWire( this.plane,y,z) ),
      this.GetY( gGeo.getTDCofX(this.plane,x ) + this.offset_track_ticks) 
      ];
}

WireView.prototype.DrawBezierTracks = function(min_u,max_u,max_v,fast) 
{
  var tracklistname = $("#ctl-TrackLists").val();
  var tracks = gRecord.tracks[tracklistname];
  if(!tracks) return;
  
  // Email exchange with Ben Jones, August 14 2013
  // So, let's see. , given points and directions (p0,v0), (p1,v1)....(pn,vn), we have this set of points:
  // 
  // start          p0 - v0
  // midpoint       p0
  // control point  p0 + a v0   where a =  |p1-p0|/(4|v0|) * Sign((p1-p0).v0)
  // control point  p1 + b v1   where b = -|p1-p0|/(4|v1|) * Sign((p1-p0).v1)
  // midpoint       p1
  // control point  p1 + a v1   where a =  |p2-p1|/(4|v1|) * Sign((p2-p1).v1)
  // control point  p2 + b v2   where b = -|p2-p1|/(4|v2|) * Sign((p2-p1).v2)
  // midpoint       p2
  // ...
  // midpoint       pn
  // end            pn + vn
  
  
  // console.warn("DrawBezierTracks");
  this.ctx.save();

  function sign(x) { return x ? x < 0 ? -1 : 1 : 0; }
  // Return an x,y screen coords tuple
  
  for(var i=0;i<tracks.length;i++)
  {
    var trk = tracks[i];
    var points = trk.points;
    if(points.length<2) continue;
    // compile points
    var segments = [];
    

    
    // First, record xyz control and endpoint positions in detector coords.
    // start point.
    var pt = points[0];
    var s = {
      p0: this.DetectorXyzToScreenXY(pt.x - pt.vx, 
                                pt.y - pt.vy,
                                pt.z - pt.vz),
      p1: this.DetectorXyzToScreenXY(pt.x,pt.y,pt.z),
    };
    s.c0 = s.p0; // Clever hack: I'm pretty sure a bezier curve with control points on the endpoints is a line.
    s.c1 = s.p1;
    segments.push(s);

    // Every pair of points 0..n-1 has two control points attached.
    for(var j=0;j<points.length-1;j++) {
      var p0 = points[j];
      var p1 = points[j+1];
      var dp = [p1.x-p0.x,p1.y-p0.y, p1.z-p0.z];
      var dp_ = Math.sqrt(dp[0]*dp[0]+dp[1]*dp[1]+dp[2]*dp[2]);
      var v0_ = Math.sqrt(p0.vx+p0.vx + p0.vy*p0.vy + p0.vz*p0.vz);
      var signa= sign(dp[0]*p0.vx + dp[1]*p0.vy + dp[2]*p0.vz);
      var scale_a = 0;
      if(signa) scale_a = dp_/(4*v0_) * signa;  // Protect against zero-length v0
      
      var v1_ = Math.sqrt(p1.vx+p1.vx + p1.vy*p1.vy + p1.vz*p1.vz);
      var signb= sign(dp[0]*p1.vx + dp[1]*p1.vy + dp[2]*p1.vz);
      var scale_b = 0;
      if(signb) scale_b = dp_/(4*v1_) * signb; // protect against zero-length v1

      // console.log(dp_,"v0",v0_,signa,scale_a,"v1",v1_,signb,scale_b);
      segments.push({
        p0: this.DetectorXyzToScreenXY(p0.x,p0.y,p0.z),
        p1: this.DetectorXyzToScreenXY(p1.x,p1.y,p1.z),
        c0: this.DetectorXyzToScreenXY(p0.x + scale_a*p0.vx,
                                       p0.y + scale_a*p0.vy,
                                       p0.z + scale_a*p0.vz
                                     ),
        c1: this.DetectorXyzToScreenXY(p1.x - scale_b*p1.vx,
                                       p1.y - scale_b*p1.vy,
                                       p1.z - scale_b*p1.vz
                                     ),
      });
    }
    
    // Last point
    pt = points[points.length-1];
    s = {
      p0: this.DetectorXyzToScreenXY(pt.x,pt.y,pt.z),
      p1: this.DetectorXyzToScreenXY(pt.x + pt.vx, 
                                     pt.y + pt.vy,
                                     pt.z + pt.vz)
    };
    s.c0 = s.p0; // Clever hack: I'm pretty sure a bezier curve with control points on the endpoints is a line.
    s.c1 = s.p1;
    segments.push(s);
    
    this.ctx.strokeStyle = "rgba(89, 169, 28, 1)";
    this.ctx.lineWidth = 2;
    
    // Draw underlay
    // Draw underlay for a selected track.
    if(gSelectState.obj && (gSelectState.obj == trk)){      

      this.ctx.lineWidth = 5;
      this.ctx.strokeStyle = "rgba(0,0,0,0.8)";
      this.ctx.beginPath();
      this.ctx.moveTo(segments[0].p0[0],segments[0].p0[1]);
      for(j=0;j<segments.length;j++) {
        s = segments[j];
        this.ctx.bezierCurveTo( s.c0[0],s.c0[1],
                                s.c1[0],s.c1[1],
                                s.p1[0],s.p1[1]);
      }
      this.ctx.stroke();
      this.ctx.lineWidth =2;
      this.ctx.strokeStyle = "rgba(255,20,20,1)";
      
      if(this.fMouseInContentArea) {
        var offset = getAbsolutePosition(this.canvas);
        var lastpt = segments[segments.length-1].p1;
        SetOverlayPosition(offset.x + lastpt[0], offset.y + lastpt[1]);  
      }
      
    }
  
    if(gHoverState.obj && (gHoverState.obj == trk)){ // hovering
      this.ctx.strokeStyle = "rgba(255,20,20,1)";
    }
        
    // Draw it.
    this.ctx.beginPath();
    this.ctx.moveTo(segments[0].p0[0],segments[0].p0[1]);
    for(j=0;j<segments.length;j++) {
      s = segments[j];
      this.ctx.bezierCurveTo( s.c0[0],s.c0[1],
                              s.c1[0],s.c1[1],
                              s.p1[0],s.p1[1]);
    }
    this.ctx.stroke();
    
    // make circles at the nodes.
    this.ctx.fillStyle = this.ctx.strokeStyle;
    for(j=0;j<segments.length-1;j++) {
      this.ctx.fillStyle = "rgba(89, 169, 28, 1)";
      this.ctx.beginPath();
      this.ctx.arc(segments[j].p0[0],segments[j].p0[1],1.5,0,1.99*Math.PI,false);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(segments[j].p1[0],segments[j].p1[1],1.5,0,1.99*Math.PI,false);
      this.ctx.fill();
      this.ctx.fillStyle = "rgba(166,95,89,0.54)";
      this.ctx.beginPath();
      this.ctx.arc(segments[j].c0[0],segments[j].c0[1],1.5,0,1.99*Math.PI,false);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(segments[j].c1[0],segments[j].c1[1],1.5,0,1.99*Math.PI,false);
      this.ctx.fill();

    }
    // console.warn("Bezier:",segments);

    // for mouseovering
    for(j=0;j<segments.length-1;j++) {
       this.mouseable.push({type:"track", 
                            coords: [[segments[j].p0[0],segments[j].p0[1]], [segments[j].p1[0],segments[j].p1[1]]],
                            r:2.0, obj: trk});
     }
  }
  this.ctx.restore();
  
};

WireView.prototype.DrawMC = function(min_u,max_u,min_v,max_v,fast)
{  
  if(!gRecord) return;
  if(!gRecord.mc) return;
  var particles = gRecord.mc.particles[gMCParticlesListName];
  if(!particles) return;
  var show_neutrals = $(this.ctl_show_mc_neutrals).is(":checked");
  var move_t0 =  $(this.ctl_mc_move_tzero).is(":checked");
  if(move_t0) console.warn('moving mc t0');
  
  // console.warn("Drawing MC",particles.length);
  for(var i=0;i<particles.length;i++)
  {
    var p= particles[i];
    if(!p.trajectory || p.trajectory.length===0) continue;

    // compile points
    var pts = [];
    var t0 = 3200;
    if(move_t0 && p.trajectory.length>0) t0 = p.trajectory[0].t/500.0; // 500 ns per tick.
    
    for(var j=0;j<p.trajectory.length;j++) {
      var point = p.trajectory[j];
      // Convert particle X coordinate to TDC value.
      var tdc = gGeo.getTDCofX(this.plane,point.x) + t0;
      // Convert YZ into wire number.
      var wire = gGeo.yzToWire(this.plane,point.y,point.z);
      var x = this.GetX(wire);
      var y = this.GetY(tdc);
      // This clips out track segments.
      // if(x>=0 && x<this.width && y>=0 && y<=this.height)
      pts.push([x,y]);
    }
    if(pts.length<2) continue;
    
    this.ctx.lineWidth =1;
    this.ctx.strokeStyle ="rgba(0,0,255,0.5)";

    // Draw underlay for a selected track.
    if(gSelectState.obj && (gSelectState.obj.ftrackId == p.ftrackId)){      
      if(this.fMouseInContentArea) {
        var offset = getAbsolutePosition(this.canvas);
        var lastpt = pts[pts.length-1];
        SetOverlayPosition(offset.x + lastpt[0], offset.y + lastpt[1]);  
      }
      
      this.ctx.lineWidth = 4;
      this.ctx.strokeStyle = "rgba(0,0,0,0.8)";
      this.ctx.beginPath();
      this.ctx.moveTo(pts[0][0],pts[0][1]);
      for(j=1;j<pts.length;j++) this.ctx.lineTo(pts[j][0],pts[j][1]);
      this.ctx.stroke();
      this.ctx.lineWidth =2;
      this.ctx.strokeStyle = "rgba(255,20,20,1)";
      
    }

    // is it an annoying neutral particle?
    var pdg = Math.abs(p.fpdgCode);
    // Note direct object compare doesn't work with MCDigraph. Don't know why; spacetree must clone instead of link objects.
    if(gHoverState.obj && (gHoverState.obj.ftrackId == p.ftrackId)){ // hovering
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = "rgba(255,20,20,1)";
      if(this.fMouseInContentArea) {
        var offset = getAbsolutePosition(this.canvas);
        var lastpt = pts[pts.length-1];
        SetOverlayPosition(offset.x + lastpt[0], offset.y + lastpt[1]);  
      }      
    } else if(pdg == 22 || pdg == 2112 || pdg == 12 || pdg == 14 || pdg == 16) {
      // Make them grey
      if(show_neutrals) this.ctx.strokeStyle ="rgba(200,200,200,0.5)";    
      else continue;  // Or skip 'em.
    }
  
    // Draw main track.
    this.ctx.beginPath();
    this.ctx.moveTo(pts[0][0],pts[0][1]);
    for(j=1;j<pts.length;j++) { this.ctx.lineTo(pts[j][0],pts[j][1]);  }
    this.ctx.stroke();
    
    
    // for mouseovering
    for(j=1;j<pts.length;j++) 
      this.mouseable.push({type:"mcparticle",
                           coords: [[pts[j-1][0],pts[j-1][1]], [pts[j][0],pts[j][1]] ],
                           r:this.ctx.lineWidth, obj: p});
  
  
  }
};

WireView.prototype.DrawdEdXPath = function(min_u,max_u,min_v,max_v,fast)
{
  // Drawing the dEdX path.
  if(!gUserTrack) return;
  if(!gUserTrack.points.length) return;
  
  this.ctx.lineWidth = 2;

  var pt, pt2;
  for(var i=0;i<gUserTrack.points.length; i++) {
    pt = gUserTrack.points[i];
    this.ctx.fillStyle = "rgba(40,92,0,0.5)";
    this.ctx.strokeStyle = "rgb(40,92,0)";
    var r = 5; // 5 pixel radius handle

    // draw handles.
    if(gHoverState.obj == pt) this.ctx.strokeStyle = "FF0000";
    var x = this.GetX(pt[this.plane]);
    var y = this.GetY(pt.tdc);
    this.ctx.beginPath();
    this.ctx.arc(x,y,r,0,Math.PI*1.99,false);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    this.mouseable.push({type:"UserTrack",
                        coords: [[x,y]],  r:r+this.ctx.lineWidth, obj: pt});
    
  }


  this.ctx.strokeStyle = "rgb(40,92,0)";

  for(i=0;i<gUserTrack.points.length-1; i++) {
    pt = gUserTrack.points[i];
    pt2 = gUserTrack.points[i+1];
    this.ctx.beginPath();    
    this.ctx.moveTo(this.GetX(pt[this.plane]), this.GetY(pt.tdc - pt.r));
    this.ctx.lineTo(this.GetX(pt[this.plane]), this.GetY(pt.tdc + pt.r));
    this.ctx.lineTo(this.GetX(pt2[this.plane]), this.GetY(pt2.tdc + pt2.r));
    this.ctx.lineTo(this.GetX(pt2[this.plane]), this.GetY(pt2.tdc - pt2.r));
    this.ctx.closePath();
    this.ctx.fill();
  }

};

WireView.prototype.DrawMyReco = function(min_u,max_u,min_v,max_v,fast)
{
  // Drawing the dEdX path.
  if (typeof gReco === 'undefined') return;
  if(!gReco) return;
  if(!gReco.matches) return;
  
  if (! ($("#ctl-show-reco").is(":checked")))  return;


  this.ctx.save();
  this.ctx.fillStyle = "rgba(0,92,0,0.5)";
  this.ctx.strokeStyle = "rgb(0,92,0)";
  var i;
  
  if(gReco.houghlines && this.plane==2)
    for(i=0;i<gReco.houghlines.length;i++)
    {      
      var line =gReco.houghlines[i];
      this.ctx.beginPath();
      this.ctx.moveTo( this.GetX(line[0][0]), this.GetY(line[0][1]) );
      for(var j = 1; j<line.length; j++) {
        this.ctx.lineTo( this.GetX(line[j][0]), this.GetY(line[j][1]) );
      }
      this.ctx.stroke();
    }
  
  this.ctx.restore();


  this.ctx.save();
  this.ctx.fillStyle = "rgba(0,92,0,0.5)";
  this.ctx.strokeStyle = "rgb(0,92,0)";
  
  for(i=0;i<gReco.matches.length;i++)
  {
    var pt =gReco.matches[i];

    // Convert particle X coordinate to TDC value.

    // Convert YZ into wire number.
    var wire = gGeo.yzToWire(this.plane,pt.y,pt.z);
    var x = this.GetX(wire);
    var y = this.GetY(pt.t + gGeo.getTDCofX(this.plane,0));
    var r = 2;
    this.ctx.beginPath();
    this.ctx.arc(x,y,r,0,Math.PI*1.99,false);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }
  
  this.ctx.restore();

};

WireView.prototype.DrawShiftRect = function(min_u,max_u,min_v,max_v,fast)
{
  this.ctx.strokeStyle = "black";
  this.ctx.lineWidth = 1;
  this.ctx.beginPath();
  this.ctx.moveTo(this.fShiftRect.x1,this.fShiftRect.y1);
  this.ctx.lineTo(this.fShiftRect.x1,this.fShiftRect.y2);
  this.ctx.lineTo(this.fShiftRect.x2,this.fShiftRect.y2);
  this.ctx.lineTo(this.fShiftRect.x2,this.fShiftRect.y1);
  this.ctx.lineTo(this.fShiftRect.x1,this.fShiftRect.y1);
  this.ctx.closePath();
  if(this.ctx.setLineDash) this.ctx.setLineDash([2,3]);
  this.ctx.stroke();
  if(this.ctx.setLineDash) this.ctx.setLineDash([]);
  
};

////////////////////////////////////////////////////////////////////////////////////////
// Mouse
////////////////////////////////////////////////////////////////////////////////////////


WireView.prototype.DoMouse = function(ev)
{
  ///
  /// Called by ::Pad for any mouse event that might be relevant,
  /// including mousemove, mousedown, click in the element
  /// and mousee move, up outside.
  
  // First, deal with mouse-ups that are probably outside my region.
  if(ev.type === 'mouseenter') return; // dont need to deal with this.
  if(ev.type === 'mouseout') return;   // dont need to deal with this.

  if(ev.type === 'mouseup') {
    if( this.fObjectDragging ) {
      this.fObjectDragging = false;
      gStateMachine.Trigger("userTrackChange");
    }
    if( this.fShiftSelecting ) {
      this.fShiftSelecting = false;
      this.fShiftRect.u1 = this.GetU(this.fShiftRect.x1);
      this.fShiftRect.u2 = this.GetU(this.fShiftRect.x2);
      this.fShiftRect.v1 = this.GetV(this.fShiftRect.y2);
      this.fShiftRect.v2 = this.GetV(this.fShiftRect.y1);
      for(var i=0;i<this.visHits.length;i++) {
        var h = this.visHits[i];
        if((h.u >= this.fShiftRect.u1) && (h.u < this.fShiftRect.u2) && (h.v >= this.fShiftRect.v1) && (h.v < this.fShiftRect.v2)) {
          gSaveSelection.AddHit(h.hit);
        }     
      } 
    }
    if( this.fDragging) {
      this.fDragging = false;
      // Update thorough
      gStateMachine.Trigger("zoomChange"); 
      this.dirty = false;
      // Draw gets issued by the trigger.
    }
    return;
  }
  
  ev.originalEvent.preventDefault();
  
  // Which area is mouse start in?
  var mouse_area;
  if(this.fMousePos.y > this.origin_y ) {
    if(this.fMousePos.x> (this.origin_x + this.span_x/2)) mouse_area = "xscale-right";
    else                                                 mouse_area = "xscale-left";
  } else if(this.fMousePos.x < this.origin_x) {
    if(this.fMousePos.y < (this.origin_y - this.span_y/2)) mouse_area = "yscale-up";
    else                                                   mouse_area = "yscale-down";
  } else {
    mouse_area = "body";
  }
  if(this.zooming) {
    // Change cursor.
    switch(mouse_area) {
      case "body":         this.canvas.style.cursor = "move";      break;
      case "xscale-right": this.canvas.style.cursor = "e-resize";  break;
      case "xscale-left":  this.canvas.style.cursor = "w-resize";  break;
      case "yscale-up":    this.canvas.style.cursor = "n-resize"; break;
      case "yscale-down":  this.canvas.style.cursor = "s-resize"; break;
    }
  }
  
  var relx, rely;
  
  if(this.fDragging) {
      // Update new zoom position or extent...
    if(this.fMouseStart.area == "body"){
      var dx = this.fMousePos.x - this.fMouseLast.x;
      var du = dx * (this.max_u-this.min_u)/(this.span_x);
      
      gZoomRegion.setLimits(this.plane,this.min_u - du, this.max_u - du);
      
      var dy = this.fMousePos.y - this.fMouseLast.y;
      var dv = dy * (this.max_v-this.min_v)/(this.span_y);
      gZoomRegion.changeTimeRange(gZoomRegion.tdc[0] + dv, gZoomRegion.tdc[1] + dv);
      
      this.fMouseLast = {};
      $.extend(this.fMouseLast,this.fMousePos); // copy.
      
    } else if(this.fMouseStart.area == "xscale-right") {
      relx = this.fMousePos.x - this.origin_x;
      if(relx <= 5) relx = 5; // Cap at 5 pixels from origin, to keep it sane.
      // Want the T I started at to move to the current posistion by scaling.
      var new_max_u = this.span_x * (this.fMouseStart.u-this.min_u)/relx + this.min_u;
      gZoomRegion.setLimits(this.plane,this.min_u, new_max_u);
      
    } else if(this.fMouseStart.area == "xscale-left") {
      relx = this.origin_x + this.span_x - this.fMousePos.x;
      if(relx <= 5) relx = 5; // Cap at 5 pixels from origin, to keep it sane.
      var new_min_u = this.max_u - this.span_x * (this.max_u - this.fMouseStart.u)/relx;
      gZoomRegion.setLimits(this.plane,new_min_u, this.max_u);
      
    } else if(this.fMouseStart.area == "yscale-up") {
      rely =  this.origin_y - this.fMousePos.y;
      if(rely <= 5) rely = 5; // Cap at 5 pixels from origin, to keep it sane.
      var new_max_v = this.span_y * (this.fMouseStart.v-this.min_v)/rely + this.min_v;
      gZoomRegion.changeTimeRange(gZoomRegion.tdc[0] , new_max_v);
    
    }else if(this.fMouseStart.area == "yscale-down") {
      rely =  this.fMousePos.y - (this.origin_y - this.span_y);
      if(rely <= 5) rely = 5; // Cap at 5 pixels from origin, to keep it sane.
      var new_min_v = this.max_v - this.span_y * (this.max_v-this.fMouseStart.v)/rely;
      gZoomRegion.changeTimeRange(new_min_v, gZoomRegion.tdc[1]);
    }
  } else if(this.fObjectDragging) {
    
    // Only user track is current thing.
    if(gHoverState.type=="UserTrack") {
      var newWire = this.fMousePos.u;
      var newTdc  = this.fMousePos.v;
      gHoverState.obj.set_view(this.plane,newWire,newTdc);
      
    }
    
  } else if(this.fShiftSelecting) {
      this.fShiftRect.x1 = Math.min(this.fMouseStart.x, this.fMousePos.x);
      this.fShiftRect.x2 = Math.max(this.fMouseStart.x, this.fMousePos.x);
      this.fShiftRect.y1 = Math.min(this.fMouseStart.y, this.fMousePos.y);
      this.fShiftRect.y2 = Math.max(this.fMouseStart.y, this.fMousePos.y);
      
  } else {
    // Regular mouse move.
    if(this.fMouseInContentArea) {
      // Find the first good match
      var match = this.FindMouseableMatch();
      if(ev.type=='click'){
        if (ev.shiftKey) {
          if(match.type=="hit") {
            if(match.obj.saveselection) {
              // deselect
              gSaveSelection.RemoveHit(match.obj);
            } else {
              // select
              gSaveSelection.AddHit(match.obj);
            }
          }
        } else {
          ChangeSelection(match);          
        }      
      } else { // not a click, but a mousemove.
        // mousemove.
        // add hover coordinates.        
        match.channel = gGeo.channelOfWire(this.plane,this.fMousePos.u);
        match.sample  = this.fMousePos.v;
        if(!match.obj) match.obj = match.channel + "|" + match.sample;
        ChangeHover(match); // match might be null.
      }
    }
                  
  }

    
  if(ev.type === 'mousedown' && this.fMouseInContentArea) {
    // Check to see if object is draggable, instead of the view.
    $.extend(this.fMouseStart,this.fMousePos); // copy.
    $.extend(this.fMouseLast ,this.fMousePos); // copy.
    this.fMouseStart.area = mouse_area;

    if (ev.shiftKey) {
      this.fShiftSelecting=true;
    } else if(gHoverState.type=="UserTrack") {
      this.fObjectDragging = true;
    } else if(this.zooming){
      this.fDragging = true;
    }
  } else if(ev.type === 'mousemove' ) {
    // Update quick.
    if(this.fDragging){
      gStateMachine.Trigger("zoomChangeFast");
      // this.dirty = false;  // Draw gets issued by the trigger.
    }
    // this.dirty = false;  // Draw gets issued by the trigger.
    // this.dirty=true; // Do a slow draw in this view.
  } 
    
};

WireView.prototype.FindMouseableMatch = function() 
{

  for(var i =this.mouseable.length-1 ; i>=0; i--) {
    var m = this.mouseable[i];
    if(m.coords.length==1) {
      // is just a point.
      var dx = m.coords[0][0] - this.fMousePos.x;
      var dy = m.coords[0][1] - this.fMousePos.y;
      if( (dx*dx + dy*dy) < (m.r*m.r) ) { return m; }
    } else if (m.coords.length==2) {
      // it's a line
      if  (GeoUtils.line_is_close_to_point(
                      this.fMousePos.x,this.fMousePos.y, 
                      m.coords[0][0], m.coords[0][1], m.coords[1][0], m.coords[1][1],
                      m.r) ) {
                        return m;                        
                      }
    } else {
      //polygon
      if(GeoUtils.is_point_in_polygon([this.fMousePos.x,this.fMousePos.y],m.coords)) {
        return m;
      }
    }
  }
  return  {obj: null, type:"wire"}; // by default, it's a wire.

};


WireView.prototype.DoMouseWheel = function(ev,dist)
{
  // Zoom in/out around the mouse.
  if(!ev.ctrlKey) {return true;}
  if(this.fMouseInContentArea) {
    var frac_x = (this.fMousePos.x - this.origin_x) / this.span_x;
    var frac_y = (this.origin_y - this.fMousePos.y ) / this.span_y;

    var scale = 1 ;
    if(dist<0) scale = 1.05;
    if(dist>0) scale = 0.95;
    var new_u_min = this.fMousePos.u*(1.0-scale) + this.min_u*scale;
    var new_u_max = (this.max_u-this.min_u)*scale + new_u_min;

    var new_v_min = this.fMousePos.v*(1.0-scale) + this.min_v*scale;
    var new_v_max = (this.max_v-this.min_v)*scale + new_v_min;
    
    gZoomRegion.setLimits(this.plane,new_u_min, new_u_max);
    gZoomRegion.changeTimeRange(new_v_min, new_v_max);
    
    // console.warn("DoMouseWheel",this.fMousePos.u,ev,dist,this.min_u,new_u_min,this.max_u,new_u_max);
    gStateMachine.Trigger("zoomChange"); 
   
    return false;
    
  }
  return true;
};

