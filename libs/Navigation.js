//
// Code for the Arachne Event Display
// Author: Nathaniel Tagg ntagg@otterbein.edu
// 
// Licence: this code is free for non-commertial use. Note other licences may apply to 3rd-party code.
// Any use of this code must include attribution to Nathaniel Tagg at Otterbein University, but otherwise 
// you're free to modify and use it as you like.
//

// Automatic runtime configuration.
// I should probably abstract this another level for a desktop-like build...


$(function(){
  $('div.A-navtree').each(function(){

    gNav = new Navigation(this);

  });  
});

// Subclass of ABoundObject.
Navigation.prototype = new ABoundObject(null);           

function Navigation(element, options)
{
  if(!element) return;
  this.first_load = true;
  var defaults = {};
  // override defaults with options.
  $.extend(true,defaults,options);
  ABoundObject.call(this, element, defaults); // Give settings to Pad contructor.

  var self = this;
  gOmData.add("HLIST");
  $(document).on("OmDataRecieved", function(){return self.GetListing()});
  console.timeStamp("Staring query.");
  gOmData.get();
  
  $(window).hashchange( function(){self.HashChange()} );
}

Navigation.prototype.GetListing = function()
{
  console.timeStamp("GetListing.");
  // console.log("GetListing");
  gOmData.remove("HLIST");

  var self = this;
  if(!gOmData.data.record.HLIST) return;
  var layout = $(gOmData.data.record.HLIST.data);
  // $("a.om-dir-title",layout).addClass('ui-helper-clearfix').prepend('<span class="collapsible-icon ui-icon ui-icon-triangle-1-e" />')
  //                        .click(function(){
  //                          $(".collapsible-icon",this).toggleClass('ui-icon-triangle-1-e')
  //                                                     .toggleClass('ui-icon-triangle-1-s');
  //                          $(this).next().toggle(200);                       
  //                        })
  //                        .each(function(){ $(this).next().hide();})
  //                        ;//.next().toggle();
  // 
  //  console.timeStamp("Done adding collapsibles.");


  // $("a",layout).click(function(){self.ItemClicked(this);});
  // console.timeStamp("Done adding click callback.");
  $(this.element).html(layout);
  $("li>ul",this.element).hide();
  
  
  // Highlight whichever one was in the url.
  if(this.first_load) {
    this.first_load = false;
    this.HashChange();
    // var item = $('a[href="'+window.location.hash+'"]', this.element);
    // console.log(window.location.hash, 'a[href='+window.location.hash+']',item);
    // console.timeStamp("Calling ItemClicked with hashload.");    
    // if(item.length>0) this.ItemClicked(item.get(0));
  }
  
}

Navigation.prototype.HashChange = function(item) 
{
  console.log("HashChange");
  var hash = location.hash;
  if(hash.length <1) return;
  var item = $('a[href="'+window.location.hash+'"]', this.element);
  if(item.length>0) this.ItemClicked(item.get(0));
}

Navigation.prototype.ItemClicked = function(item)
{
  $(".ui-state-highlight",this.element).removeClass("ui-state-highlight");
  $(item).parent().addClass("ui-state-highlight");
  
  // Reveal all elements above.
  $("li>ul",this.element).hide();
  
  $(item).parentsUntil(this.element).show();//.children(".collapsible-icon").addClass('ui-icon-triangle-1-s'.removeClass('ui-icon-triangle-1-e');
  
  // Do that mother. Is the selected thing an object?
  var items = [];
  if($(item).hasClass("om-elem")) {
    items.push(
      { path: $(item).data("ompath"),
        roottype: $(item).data("roottype")
      }
    );
  } else {
    // It's a directory. Pull all objects, but not sub-objects.    
    console.log($($(item).next().children('li')));
    $($(item).next().show(200).children('li').children('a')).each(function(){
      if($(this).hasClass("om-elem")) {
        items.push(
          { path: $(this).data("ompath"),
            roottype: $(this).data("roottype")
          }
        );
      };
    });
  }

  console.log(items);
  
  // Clear the main area.
  $("div.A-mainview").empty();
  // Add new histogram objects to the dom.
  for(var i=0;i<items.length;i++) {
    var item = items[i];
    console.log("Creating new object for ",item);

    if(item.path.match(/tpc\/mapccc/)) {
      var e = $("<div class='A-OmHistCanvas' data-options='path:"+item.path+" style='clear:both;' />");
      $("div.A-mainview").append(e);
      new ChannelMap(e,item.path);
      
    } else {
    
      // Default: for a TH1 object, which is most of them:
      var e = $("<div class='A-OmHistCanvas' data-options='path:"+item.path+"'  style='clear:both;' />");
      $("div.A-mainview").append(e);
      new OmHistCanvas(e,item.path);
      // $('div.A-OmHistCanvas').each(function(){ new OmHistCanvas(this) });
    }
  }
  // Activate the elements.
  console.timeStamp("New displays ready, calling get for data");
  
  // Go get the data.
  gOmData.get();
  
}
