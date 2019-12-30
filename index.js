const P2J = require('pipe2jpeg');
const fs = require('fs');
const $ = require('jquery');

const spawn = require('child_process').spawn;

let jpegCounter = 0;

const preview_params = [
  '--capture-movie',
  '--stdout'
];

const capture_params = [
  '--capture-image-and-download',
  '--stdout'
];

const capture_stream = new P2J();
let p_gphoto;
let p_gstream;
let is_capturing = false;
let is_previewing = false;

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const booth = {
  async countDown(secs) {
    $('.countdown').css({ display: 'flex' });

    for(let i=secs-1; i>=0; i--) {
      $('.countdown').html(i==0 ? 'Happy<br>Holidays!!' : i);
      await wait(1000);
    }

  },

  startStream() {
    $('#start').hide();
    $('#myimage').show();
    let stream = new P2J();
    p_gstream = spawn('gphoto2', preview_params, {stdio : ['ignore', 'pipe', 'ignore']});
    p_gstream.stdout.pipe(stream);
    stream.on('jpeg', (buf) => {
      document.getElementById("myimage").src =  'data:image/jpeg;base64,' + buf.toString('base64');
    });
  },

  stopStream() {
    //is_previewing = true;
    //console.log('STOPPING THE STREAM');
    clearTimeout(this.ttout);
    if(p_gstream) p_gstream.kill();
  },

  endSession() {
    is_previewing = false;
    is_capturing = false;
    console.log('end session');
    $('#start').show();
    $('#myimage').hide();
  },

  enableLive() {
    if(is_previewing || is_capturing) return;
    is_previewing = true;

    booth.startStream();
    clearTimeout(this.ttout);
    this.ttout = setTimeout(() => {
      console.log('timeout triggered');
      this.stopStream();
      is_previewing = false;
    }, 60000)
  },

  async takeImage() {
    if(is_capturing) return;
    if(!is_previewing) return;

    console.log('Capturing Image');
    is_capturing = true;

    await this.countDown(4);

    this.stopStream();

    await wait(700);

    let stream = new P2J();

    stream.on('jpeg', (buf) => {
      if(buf.length > 830135) type = 'full'
      else if(buf.length > 7555 && buf.length < 9000) type = 'thumb';
      else type = 'trash';

      console.log(type)
      console.log(buf.length)

      if(type == 'trash') return;
      let timestamp = +new Date;

      fs.writeFileSync(`./captures/${timestamp}_halloween_${type}.jpg`, buf);

      $('.countdown').hide();
      if(type == 'full') document.getElementById("myimage").src =  'data:image/jpeg;base64,' + buf.toString('base64');
    });

    p_gphoto = spawn('gphoto2', capture_params, {stdio : ['ignore', 'pipe', 'ignore']});
    p_gphoto.stdout.pipe(stream);
    p_gphoto.on('close',async () => {
      console.log('the capture processes ended');
      await wait(5000);
      console.log('stopping the session');

      this.endSession();
    });
  }
};

$(() => {
  $(document).mousedown(function(event) {
      switch (event.which) {
          case 1: 
              booth.takeImage();
              break;
          case 3:
              booth.enableLive();
              break;
      }
  });
});
