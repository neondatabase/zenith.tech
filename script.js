/**
 * WARNING:
 *
 * For the love of god please don't try to run actual commands via this
 * "console".  It's horribly simplified and was simply a nice way to pass the
 * time on an airplane.
 *
 * Also I got pretty lazy with the tab completion stuff - it's gnarly.
 *
 * ALSO ALSO: this probably only works in Chrome.
 */

const reWhitespace = new RegExp("\\s+");

let cmds = [];
let tmpCmd = null;
let historyOffset = null;

let $console = document.getElementById("console");
let currentLine = document.getElementsByClassName("console-line")[1];
let currentBody = currentLine.getElementsByClassName("body")[0];
const consoleLineTemplate = currentLine.cloneNode(true);

window.onkeydown = (ev) => {
  let preventDefault = true;
  switch (ev.key) {
    case "Backspace":
      let content = currentBody.textContent;
      currentBody.textContent = content.slice(0, content.length - 1);
      break;
    case "Tab":
      complete(currentBody.textContent);
      break;
    case "Enter":
      run(currentBody.textContent);
      break;
    case "ArrowUp":
      if (cmds.length > 0) {
        if (historyOffset === null) {
          tmpCmd = currentBody.textContent;
          historyOffset = cmds.length;
        }

        historyOffset = Math.max(0, historyOffset - 1);
        if (cmds[historyOffset]) {
          currentBody.textContent = cmds[historyOffset];
        }
      }
      break;
    case "ArrowDown":
      if ((historyOffset !== null) & (historyOffset < cmds.length)) {
        historyOffset = Math.min(cmds.length, historyOffset + 1);
        if (cmds[historyOffset]) {
          currentBody.textContent = cmds[historyOffset];
        } else {
          currentBody.textContent = tmpCmd;
        }
      }
      break;
    default:
      if (ev.key.length === 1 && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
        currentBody.textContent += ev.key;
      } else {
        preventDefault = false;
      }
  }
  if (preventDefault) {
    ev.preventDefault();
  }
};

const clear = () => {
  currentLine = consoleLineTemplate.cloneNode(true);
  currentBody = currentLine.getElementsByClassName("body")[0];
  $console.append(currentLine);
};

const scrollDown = () => window.scroll(0, document.body.scrollHeight);

const complete = (line) => {
  line = line.trim();

  // parse line
  const parts = line.split(reWhitespace);
  const cmd = parts[0];
  const argv = parts.slice(1);

  const cmdFn = commands[cmd];

  let prefix = "";
  let choices = [];
  if (!cmdFn) {
    // case 1: failed to find a command
    // treat this as a call to help, if no args
    if (argv.length === 0) {
      choices = cmdHelp.complete([cmd]);
    }
  } else if (cmdFn.complete) {
    prefix = cmd + " ";
    // case 2: complete arguments to a command
    choices = commands[cmd].complete(argv);
  }

  if (choices.length === 1) {
    currentBody.textContent = prefix + choices[0];
  } else if (choices.length > 1) {
    // remove cursor from current line
    currentLine.classList.remove("active");

    // save content
    const content = currentBody.textContent;

    // setup stdout
    let stdout = document.createElement("div");
    stdout.classList.add("stdout");
    $console.append(stdout);

    for (let i = 0; i < choices.length; i++) {
      if (i !== 0) {
        stdout.innerHTML += "<br />";
      }
      stdout.innerHTML += choices[i];
    }

    // write new prompt
    currentLine = consoleLineTemplate.cloneNode(true);
    currentBody = currentLine.getElementsByClassName("body")[0];
    currentBody.textContent = content;
    $console.append(currentLine);
    scrollDown();
  }
};

const run = (line, silent) => {
  // reset history pointers
  tmpCmd = historyOffset = null;

  // remove cursor from current line
  currentLine.classList.remove("active");

  line = line.trim();
  if (line !== "") {
    // record history if not a dup
    if (!silent && line !== cmds[cmds.length - 1]) {
      cmds.push(line);
    }

    // setup stdout
    let stdout = document.createElement("div");
    stdout.classList.add("stdout");
    $console.append(stdout);

    const print = (s) => {
      stdout.innerHTML += s;
      scrollDown();
    };

    // parse line
    const parts = line.split(reWhitespace);
    const cmd = parts[0];
    const argv = parts.slice(1);

    // run command
    if (commands.hasOwnProperty(cmd)) {
      commands[cmd](argv, print);
    } else {
      print("command not found: " + cmd);
    }
  }

  // write new prompt
  currentLine = consoleLineTemplate.cloneNode(true);
  currentBody = currentLine.getElementsByClassName("body")[0];
  $console.append(currentLine);
  scrollDown();
};

const cmdHelp = (_, print) => {
  const cmds = Object.keys(commands);
  for (let i = 0; i < cmds.length; i++) {
    if (i > 0) {
      print("<br />");
    }
    print(cmds[i] + ": " + commands[cmds[i]].help);
  }
};

cmdHelp.help = "this command";

cmdHelp.complete = (argv) => {
  const cmds = Object.keys(commands);
  const choices = [];
  for (let i = 0; i < cmds.length; i++) {
    if (cmds[i].indexOf(argv[0] || "") === 0) {
      choices.push(cmds[i]);
    }
  }
  return choices;
};

const cmdLs = (argv, print) => {
  for (let i = 0; i < files.length; i++) {
    if (argv.length === 0 || argv[0] === files[i].name) {
      if (i > 0) {
        print(" ");
      }
      print(files[i].name);
    }
  }
};

cmdLs.help = "list files";

const cmdCat = (argv, print) => {
  for (let i = 0; i < files.length; i++) {
    if (files[i].name === argv[0]) {
      print(files[i].content);
      return;
    }
  }
  print(argv[0] + ": no such file");
};

cmdCat.help = "read a file";

cmdCat.complete = (argv) => {
  const choices = [];
  for (let i = 0; i < files.length; i++) {
    if (files[i].name.indexOf(argv[0] || "") === 0) {
      choices.push(files[i].name);
    }
  }
  return choices;
};

const cmdClear = () => {
  $console.replaceChildren();
};

cmdClear.help = "clear the screen";

const commands = {
  help: cmdHelp,
  ls: cmdLs,
  cat: cmdCat,
  clear: cmdClear,
};

const files = [
  {
    name: "jobs.txt",
    content: `
<p>We're currently looking for:</p>
<ul>
  <li>Systems Software Engineer - distributed storage engine (Rust) and Postgres extension</li>
  <li>Backend/Web Engineer - web console, serverless API</li>
  <li>Infrastructure Engineer - cloud orchestration, database proxy</li>
</ul>
<p>To apply, please send a resume and cover letter to <a href="mailto:jobs@zenith.tech">jobs@zenith.tech</a></p>
`,
  },
  {
    name: "rocket.svg",
    content: `
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 196.14814814814815 252.13099691873754" width="196.14814814814815" height="252.13099691873754">
  <!-- svg-source:excalidraw -->
  <defs>
    <style>
      @font-face {
        font-family: "Virgil";
        src: url("https://excalidraw.com/FG_Virgil.woff2");
      }
      @font-face {
        font-family: "Cascadia";
        src: url("https://excalidraw.com/Cascadia.woff2");
      }
    </style>
  </defs>
  <g transform="translate(10 22.651776695124454) rotate(0 88.07407407407408 82)"><path d="M73.24534410606489 0.34896140191696645 C84.30156899908485 -2.5357706282678145, 99.50264962272541 0.7430522184873709, 111.29397960107255 3.7880176421053307 C123.08530957941969 6.83298306572329, 134.6594711350338 11.365042069469698, 143.99332397614768 18.618753943624725 C153.32717681726155 25.87246581777975, 161.90857783446828 37.10071609191041, 167.29709664775584 47.31028888703549 C172.6856154610434 57.519861682160574, 176.03959325869752 68.7026029290766, 176.324436855873 79.87619071437524 C176.60928045304846 91.04977849967388, 173.6816423590885 103.91824074473062, 169.00615823080864 114.3518155988273 C164.33067410252877 124.78539045292398, 157.3183543996333 134.80412064330065, 148.27153208619387 142.47763983895533 C139.22470977275444 150.15115903461, 126.46121908830558 156.78216329707942, 114.72522435017197 160.39293077275536 C102.98922961203836 164.0036982484313, 89.99318829447527 165.56925806896587, 77.85556365739217 164.142244693011 C65.71793902030906 162.71523131705615, 52.45022421868395 157.79985462896568, 41.89947652767332 151.8308505170262 C31.348728836662694 145.8618464050867, 21.412827448396968 137.55004865830125, 14.551077511328415 128.32822002137408 C7.689327574259864 119.10639138444691, 2.553019025912884 107.7158148509766, 0.7289769052620159 96.49987869546314 C-1.0950652153888523 85.28394253994968, 0.5509307666361423 71.95075405525431, 3.606824787423207 61.03260308829334 C6.662718808210272 50.114452121332384, 11.725382711672456 39.61448567754856, 19.064341029984405 30.990972893697375 C26.403299348296354 22.367460109846192, 36.271332379178595 14.583575509784453, 47.6405746972949 9.29152638518623 C59.00981701541121 3.9994772605880087, 78.23401788858288 0.2523695016064995, 87.27979493868226 -0.7613218538919568 C96.32557198878163 -1.7750132093904132, 101.93238551877242 1.5504100907601763, 101.91523699789113 3.209378252195492 M98.3091189460013 0.6283412145317726 C109.81123133415768 0.6638108099542303, 123.26890202553113 5.551312188172933, 133.91866856975085 11.396238977149139 C144.56843511397057 17.241165766125345, 155.59296102419438 26.314235133853288, 162.20771821131956 35.69790194838901 C168.82247539844474 45.08156876292473, 171.6082464009453 56.096042018712886, 173.60721169250183 67.69823986436349 C175.60617698405838 79.3004377100141, 176.9601888750078 94.16031662664865, 174.2015099606588 105.31108902229263 C171.4428310463098 116.46186141793662, 165.16607903307155 126.35961118717415, 157.05513820640795 134.60287423822737 C148.94419737974434 142.8461372892806, 136.60401426917713 150.1221861647588, 125.53586500067715 154.77066732861198 C114.46771573217718 159.41914849246515, 102.49155298245563 161.87544053007758, 90.64624259540813 162.49376122134643 C78.80093220836062 163.11208191261528, 65.9280532251679 162.714961152919, 54.46400267839213 158.48059147622507 C42.99995213161636 154.24622179953116, 30.1530217483243 145.67379888104185, 21.861939314753528 137.08754316118294 C13.570856881182754 128.50128744132402, 8.22379512622224 117.51836577073686, 4.717508076967491 106.96305715707167 C1.211221027712741 96.40774854340648, -0.669639899382074 85.08235210982154, 0.8242170192250313 73.75569147919175 C2.3180739378321364 62.429030848561965, 7.440494330237496 48.733019206047004, 13.680649588610123 39.00309337329294 C19.92080484698275 29.27316754053888, 28.409093420490564 21.63023783672811, 38.26514856946079 15.376136482667391 C48.12120371843102 9.122035128606672, 62.35424115135671 3.795208481270322, 72.81698048243148 1.4784852489286209 C83.27971981350625 -0.8382379834130802, 96.82473157600505 1.195848389891277, 101.0415845559094 1.4757970886171847 C105.25843753581374 1.7557457873430924, 98.68826987206847 1.836768974743876, 98.11809836185752 3.1581774412840673" stroke="none" stroke-width="0" fill="#228be6"></path><path d="M57.58173162726706 5.28557227206926 C68.09678649045631 0.22149482510464225, 82.65287793480671 -0.7056440661727047, 94.81027444624274 0.031284532562395384 C106.96767095767878 0.7682131312974955, 119.75277136917776 4.415552818682733, 130.5261106958833 9.70714386447986 C141.29945002258881 14.998734910276987, 152.0779703876563 22.52805706001105, 159.4503104064759 31.78083080734516 C166.82265042529548 41.03360455467927, 172.35088537320064 54.04765995492952, 174.76015080880074 65.22378634848451 C177.16941624440085 76.3999127420395, 176.52926389976028 87.89728130810887, 173.90590302007644 98.8375891686751 C171.2825421403926 109.77789702924132, 166.03293959963423 121.72067847815657, 159.01998553069768 130.8656335118818 C152.00703146176113 140.01058854560705, 142.48784150267028 148.26266518204005, 131.8281786064571 153.70731937102653 C121.16851571024392 159.151973560013, 107.28987423742885 162.71475828721606, 95.06200815341865 163.53355864580067 C82.83414206940844 164.35235900438528, 69.71681476957971 162.4980455501003, 58.46098210239593 158.6201215225342 C47.20514943521216 154.74219749496808, 36.39753357940172 147.9962686022161, 27.527012150315976 140.2660144804041 C18.656490721230234 132.53576035859209, 9.670063126980459 122.8209116238142, 5.2378535278814695 112.23859679166222 C0.805643928782481 101.65628195951024, 0.04666270377204762 88.27412342392928, 0.9337545557220466 76.77212548749219 C1.8208464076720454 65.2701275510551, 4.984815533161206 53.09282190736034, 10.560404639581463 43.22660917303964 C16.13599374600172 33.360396438718944, 24.17432816041005 24.41365133271509, 34.38728919424359 17.574849081568004 C44.60025022807714 10.736046830420918, 63.4369956858862 4.898511850614296, 71.83817084258274 2.193795666157129 C80.23934599927928 -0.5109205183000376, 84.74817580406283 0.27280588374515236, 84.79434013442282 1.3465519748250045 M98.95416923622237 -0.24240751452732923 C110.53103684206977 -0.1111436054142724, 123.72520830997784 6.222981376293795, 134.0247142860767 12.26472900033366 C144.32422026217552 18.306476624373524, 153.6770783948059 26.625649863731788, 160.7512050928154 36.008078229711856 C167.82533179082492 45.390506595691924, 174.33855226314625 57.08495831061515, 176.46947447413376 68.55929919621407 C178.60039668512127 80.03364008181299, 177.00442450498136 94.01497506073491, 173.53673835874048 104.85412354330538 C170.0690522124996 115.69327202587584, 163.7125982570248 125.03231509447744, 155.6633575966885 133.59419009163682 C147.61411693635222 142.1560650887962, 136.23844950643806 150.94245890822825, 125.2412943967228 156.22537352626168 C114.24413928700753 161.5082881442951, 101.5785994826793 165.16488846110167, 89.68042693839688 165.29167779983737 C77.78225439411446 165.41846713857308, 64.99715326083725 161.40566254227122, 53.85225913102827 156.98610955867588 C42.70736500121929 152.56655657508054, 31.286030212590088 146.9314059674282, 22.811062159542985 138.7743598982654 C14.336094106495882 130.6173138291026, 6.942352187113741 118.87026074022353, 3.00245081274565 108.04383314369912 C-0.9374505616224411 97.2174055471747, -2.519250833742956 85.05029029001587, -0.8283460866655616 73.81579431911891 C0.8625586604118329 62.58129834822194, 6.574215139922138 50.46888699415767, 13.147879295210018 40.63685731831734 C19.721543450497897 30.804827642477008, 28.6581495071538 21.552993570925906, 38.61363884506172 14.823616264076918 C48.56912818296964 8.09423895722793, 62.80260737606827 2.719559582851223, 72.88081532265753 0.2605934772234093 C82.95902326924679 -2.1983726284044045, 94.87140787233159 -0.4922967033754304, 99.08288652459724 0.06981963031003602 C103.2943651768629 0.6319359639955024, 98.35617196041665 2.168811999594591, 98.14968723625142 3.633291479336208" stroke="#000000" stroke-width="1" fill="none"></path></g><g><g transform="translate(70 140.65177669512445) rotate(0 -17.49852037569508 50.399225232191384)" fill-rule="evenodd"><path d="M-0.9292515460401773 0.09862109459936619 L-56.46114259399474 37.18584528006613 L-28.062485927715898 31.741783225908875 L-51.38190215267241 67.20118835009634 L-12.437152499333024 32.21170469559729 L-48.80263882316649 99.82136693038046 L-5.796903604641557 51.66610034741461 L6.329870050773025 35.15722086466849 L-0.7916415873914957 81.66893502511084 L19.162597125396132 14.72583999671042 L0.02248120866715908 1.190423572435975" stroke="none" stroke-width="0" fill="#fab005" fill-rule="evenodd"></path><path d="M1.609341824427247 0.5392069276422262 C-17.692331196889285 12.942233663117515, -35.59700133508072 23.543348763389513, -56.75526926480234 39.3973187264055 M0.8764956025406718 -0.6807697592303157 C-22.517223361320795 15.647373151825741, -46.098407450970264 29.568167947093023, -56.0189295085147 37.25369448680431 M-56.697665905579925 39.96907175146043 C-49.88298262000084 37.21853619498201, -45.02435355210677 36.11670655720867, -29.98278442583978 33.01298028789461 M-56.88931062538177 37.08680219668895 C-47.01545292299241 36.60740260644816, -35.43302304374054 33.800334626762194, -27.516513881273568 32.358437043614686 M-29.016504919156432 32.2910473998636 C-33.813841549307114 43.827555849784986, -41.96642148615793 54.88745507617481, -51.84999952279031 67.67303538881242 M-27.101364907808602 32.0145351709798 C-33.9062065198645 41.07609025123529, -39.197519781682644 48.623588900035244, -51.31682213861495 66.67854691762477 M-49.469672774896026 64.42548299394548 C-37.950947037236766 56.986415184754875, -26.098151961611585 44.97894211802631, -12.90714648924768 33.1318175252527 M-51.677422371692955 66.14469600934535 C-40.40687096334062 57.729511633608496, -31.06070796987973 50.713028990104796, -10.139367219991982 32.60492376703769 M-12.998026406392455 34.26733702979982 C-20.574401584491135 47.52615068497136, -30.50078993629664 62.20606510693207, -48.96031663380563 100.55576956830919 M-10.516683456487954 33.17287186998874 C-22.158579539842904 55.97309179076925, -34.63447189122438 76.7711237098463, -48.46635737735778 100.46303756255656 M-50.29828212223947 99.62367737852037 C-34.83415028580465 84.64774289778434, -21.544677633671093 69.17517617163249, -3.0089606400579214 48.46094376407564 M-48.03104391414672 101.47922022361308 C-34.46330198722892 86.16306787733919, -20.033235138589514 68.54127521901391, -3.0739461751654744 49.54417858738452 M-5.51445278807818 48.40958600641046 C-2.1652955872770905 47.653153281357284, -0.06307772577103465 42.753690902957715, 7.562708243395 37.41981527666389 M-3.721581277370398 49.27716282613683 C-0.7712975477434113 46.947009345469574, 1.433800567975417 42.93595459184551, 6.375506560261226 35.25736765743879 M7.594338083639741 36.2936353739351 C3.0231533900648353 50.14480659882538, 4.543447429109364 62.07170153870248, 1.3177301529794931 83.15221447311342 M5.516377481631935 35.05741585511714 C5.745393590144813 47.18057223991491, 3.606625924427062 57.07193139237352, 0.10723948758095503 81.55730502028018 M1.1769845131784678 81.21943563781679 C9.23378833920695 58.4651327610854, 15.37153576041572 32.518354524848974, 21.289866710081697 12.15596235357225 M1.4096412686631083 81.79367963690311 C8.708572361199185 56.91496136563829, 15.332676904881374 31.19303877421654, 19.092730256728828 12.182222557254136 M21.89226987399161 14.759087448939681 C16.836041024988518 8.814477237593383, 11.17802284761332 9.074216251447798, 0.5851329211145639 0.9512351211160421 M20.228269550018013 13.79944891948253 C13.15290596392937 8.494592879991979, 4.984388260738923 3.0015426883473992, 0.12855500262230635 -0.5214684186503291 M0 0 C0 0, 0 0, 0 0 M0 0 C0 0, 0 0, 0 0" stroke="#000000" stroke-width="1" fill="none"></path></g></g><g><g transform="translate(95.11039867109969 148.15177669512445) rotate(0 -34.059067991317136 29.14031899174961)" fill-rule="evenodd"><path d="M-23.822205425699764 -0.8392415996640921 L-56.03125738538802 20.356023282964166 L-38.55110048625737 19.144710834176454 L-51.543968145636896 39.25362855023467 L-28.09147289661174 20.81989009312701 L-52.42505543231226 59.590872662408515 L-27.18624380687021 29.106868845994452 L-18.09932709893922 21.848924457255137 L-24.34763782531263 49.31401921684672 L-10.908617631042162 7.2609149733772345 L-24.067833663424068 -1.5599047895520926" stroke="none" stroke-width="0" fill="#fd7e14" fill-rule="evenodd"></path><path d="M-22.843584460665994 -1.8266384545713663 C-36.30156482128281 7.593422138385909, -46.307379366254466 14.968957690346217, -57.39755586348474 23.76218707602137 M-24.266094599378818 0.18645573873072863 C-33.447182017801886 6.888786871049936, -44.570713292719105 14.411051363129467, -57.262437221594155 22.0741497764703 M-55.36431640180474 21.110895019126495 C-52.67026010211484 22.793004210083986, -49.03819295144315 19.14337018495108, -40.779382908973865 18.98966873002902 M-56.69671062943578 21.82496704078427 C-51.14148188726561 21.351088442994104, -44.556407018421275 18.89741965181257, -39.207806396426804 19.012374539267167 M-40.83897188801437 17.304276621938858 C-45.462996754202216 24.358121289113605, -46.866800683611224 29.39198647043966, -51.841759906051735 36.5475615655514 M-39.67344185367345 18.60456429239473 C-44.11381088598555 25.049300679956417, -49.30237984909688 32.432568591082834, -53.95125604411034 39.05948133873516 M-53.269218192337135 39.70862428298914 C-45.24043698211589 30.617322064104684, -38.9042921186003 28.24725333650047, -31.58895333004599 17.941887788543223 M-52.984257705411 39.0362886946159 C-45.989833226635895 33.81210955333917, -38.756726063794595 27.342275571070537, -29.7117924148724 18.37642413291496 M-29.69416125012045 17.45037787414503 C-37.20910366096908 30.304601561455403, -39.66060730243637 37.457190230682954, -51.010282247506154 60.1072764380707 M-29.927769845216027 18.929884015651165 C-39.17895112987532 34.810019988165905, -46.72211243379316 51.216715099912996, -51.81287567894168 58.11974761382328 M-51.36599370761968 57.55938529808657 C-43.90853463991345 49.25366631448461, -37.22043640788632 42.14146885987232, -27.45162041568898 31.11258455517409 M-52.10904567520328 59.69785807028995 C-43.96997265307114 49.85878101736384, -38.30057004978918 41.781599949814776, -25.796027786934303 28.224367172109762 M-25.134797092226318 28.963827259414757 C-23.6484250386415 26.046633148988086, -21.914592492585907 24.2834689876714, -19.511779779626114 21.059333740445133 M-25.879471238280697 28.754586784598214 C-24.01233181660267 27.509047058321514, -22.519092272178465 24.66496174142491, -20.10099512603963 21.23049870137616 M-18.803301625314752 20.29456178394271 C-21.086038642745883 31.58258218039044, -22.831994274706734 40.20160881424335, -21.43900081947686 48.13092791537572 M-19.95229192021082 21.38403685593171 C-21.047918637031223 29.012511538580988, -21.485519410459816 36.1465444088662, -22.957487310881334 47.26950133002181 M-23.388996337207573 47.89729153613378 C-17.715703161192376 34.79107383852252, -17.72624988506685 26.791579221093656, -12.675602373176972 9.140427383988149 M-21.924410786146836 46.90642678892989 C-19.05584857023695 32.27485491019355, -14.787796502475508 18.73674399638932, -10.720580119149545 8.019651541880316 M-12.635978193041428 8.326577830914548 C-14.07906876390938 5.287999039113775, -19.353766625513625 3.822806613988827, -23.583930817136707 0.32146443715799267 M-11.991083843676257 8.241521842519234 C-15.306832847542479 5.8280485911137445, -17.922043514933797 3.159496021355147, -23.169961202751015 -0.4110420991427467 M-23.399905509775095 0 C-23.399905509775095 0, -23.399905509775095 0, -23.399905509775095 0 M-23.399905509775095 0 C-23.399905509775095 0, -23.399905509775095 0, -23.399905509775095 0" stroke="transparent" stroke-width="1" fill="none"></path></g></g><g transform="translate(92.99999999999997 2.651776695124454) rotate(29.547989358870286 39.500000000000014 56.5)"><path d="M41.74812394939363 -0.30883882008492947 L79.04131568036973 55.3492071274668 L38.57724994979799 111.43232669867575 L-1.1579282227903605 58.64675768651068" stroke="none" stroke-width="0" fill="#fa5252" fill-rule="evenodd"></path><path d="M38.307191813364625 -1.5439770761877298 C47.230851483037696 14.999350365558639, 59.127680964926256 25.981692758789286, 79.27686264552176 57.43676198087633 M40.32849109452218 0.593623680062592 C50.39993826691993 14.70014466176741, 58.820645012436444 28.060721029611308, 78.6529489485547 56.498695683665574 M79.39873602427542 56.38662779890001 C68.88463080031798 69.78844912466593, 60.724639465473594 86.51463762116619, 41.522850597277284 114.52118117175996 M79.972600790672 57.41276652831584 C65.61367261653766 75.26388340740465, 50.56684953860939 94.61234605087898, 39.107883038930595 113.62217221874744 M40.24285324849188 111.76915795169771 C22.86611245781183 90.70375966131687, 8.042875325530762 70.07096964046359, 0.2607304099947214 58.71762085519731 M40.165213408879936 112.01646004337817 C29.455891396291555 98.51953493040055, 20.107675559259953 82.69250822719187, 0.8837504712864757 56.51899946946651 M1.3967334274202585 58.71927500329912 C9.224795522866772 41.765767354238776, 20.454488887218762 28.58678795937448, 41.36995765008032 1.2257270272821188 M-0.5387699278071523 56.03681482095271 C10.278650656500831 42.884410188440235, 20.66018876821734 28.026231265440583, 39.35869455616921 -0.4550791559740901" stroke="#000000" stroke-width="1" fill="none"></path></g><g transform="translate(39.80039787798398 82.34367673852171) rotate(303.111341960372 60.5 27.547489877027147)"><path d="M-0.2944242302328348 -0.15201756916940212 L122.95991862379014 -0.7681110259145498 L119.51266807876527 56.09580983255182 L-0.9312808457762003 53.23727329108988" stroke="none" stroke-width="0" fill="#ced4da"></path><path d="M1.4375543240457773 0.18477601371705532 C46.51628881832585 -1.8739653988461942, 95.9126140261069 -1.1252282424550504, 120.81722881831229 1.4522887524217367 M0.013714197091758251 -0.0019921837374567986 C32.689026114624 -0.4420324106607587, 66.15755378380419 0.5863275687303393, 121.41466436069459 0.26335508842021227 M122.18739321269095 0.6577698048204184 C120.62582870052744 19.62721102704762, 120.83635916040826 36.94956324475822, 121.99397238530219 55.13599067587529 M121.4129050699994 -0.6593660591170192 C120.71362894918047 15.429497469102115, 120.52432260061823 30.954591656806112, 120.6525116590783 55.485275122673556 M122.81382855214179 54.413020190188035 C86.46225530439987 55.34805621503976, 50.06120734047144 52.88225861190942, 1.8803812507539988 54.978334900328264 M121.40014964621514 54.718552205116794 C75.47637720340862 57.03919324983966, 30.766657914593807 55.89463872422588, 0.9539680806919932 56.088202837259814 M-1.7821997161954641 54.53247928280507 C-0.8650024792194048 38.659397000854234, 0.6135905722141585 24.004338019074297, 1.6996609810739756 0.33521742187440395 M0.1084740487858653 55.24578869655852 C-0.06704968747520573 35.57741104351955, 0.7291500217018114 14.87852821012168, -0.22469806391745806 -0.4002433596178889" stroke="#000000" stroke-width="1" fill="none"></path></g><g transform="translate(53 110.65177669512445) rotate(302.90524292298795 28.5 12.5)"><text x="0" y="18" font-family="Virgil, Segoe UI Emoji" font-size="20px" fill="#495057" text-anchor="start" style="white-space: pre;" direction="ltr">zenith</text></g><g><g transform="translate(85 171.65177669512445) rotate(0 33.54373079398647 -49.570507073774934)"><path d="M0.8888839725404978 -0.681761497631669 C20.045715980464596 -30.18310457267799, 41.76485029957258 -61.5628235412296, 66.5280093792826 -98.4592526499182 M0.5594522086903453 -0.6824343083426356 C20.736290396554395 -30.79284170414321, 42.04490240466781 -62.58856856194325, 64.31164920609444 -96.38117261510342" stroke="white" stroke-width="4" fill="none"></path></g></g><g><g transform="translate(49 142.65177669512445) rotate(0 30.812948518898338 -44.81638588150963)"><path d="M1.719080513343215 1.73545959033072 C16.406443951735273 -24.173671742146833, 32.61592629606835 -45.571692018480974, 61.64099312387407 -89.62091747485101 M-0.015096086077392101 -0.7031710417941213 C23.549625153196978 -34.36779675771482, 47.00842007101514 -70.63720266371034, 60.668198955245316 -91.36823135334998" stroke="white" stroke-width="1" fill="none"></path></g></g><g><g transform="translate(159 16.651776695124454) rotate(0 3.2878040014766157 31.276830065064132)"><path d="M0.6608916576951742 1.9012086037546396 C1.97461247112602 14.255860027996825, 2.1326602873764933 25.70138055770658, 3.4001966174691916 61.89092185534537 M0.7690389873459935 0.2809581784531474 C0.96232736364007 15.542136893281715, 1.651988569851965 28.489654943393546, 5.914716345258057 62.27270195167512" stroke="white" stroke-width="1" fill="none"></path></g></g></svg>
`,
  },
];
