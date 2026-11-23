export const COURSE_CHAPTERS = [
  {
    "id": "overview",
    "marker": "0",
    "shortTitle": "全体像",
    "title": "回路の全体像",
    "kind": "overview"
  },
  {
    "id": "trigger",
    "marker": "1",
    "shortTitle": "トリガー回路",
    "title": "一打のパルスを作る"
  },
  {
    "id": "resonator",
    "marker": "2",
    "shortTitle": "電圧の振動を作る回路",
    "title": "音になる振動を作る"
  },
  {
    "id": "pitch-decay",
    "marker": "3",
    "shortTitle": "音程・余韻の調整回路",
    "title": "余韻を伸ばす"
  },
  {
    "id": "pitch-envelope",
    "marker": "4",
    "shortTitle": "音程変化の制御回路",
    "title": "音程を落とす"
  },
  {
    "id": "tone",
    "marker": "5",
    "shortTitle": "音色調整回路",
    "title": "高い音の成分を弱める"
  },
  {
    "id": "distortion-output",
    "marker": "6",
    "shortTitle": "歪み・出力回路",
    "title": "波形を歪ませる"
  }
];

COURSE_CHAPTERS[0].sections = [
  {
    readPath: '0/0',
    title: '入力のGATE INと出力のOUTPUT',
    text: '左下のGATE INは、一打を鳴らすタイミングを決める入力端子です。右下のOUTPUTが、できあがった一打の音声信号を取り出す端子です。\n\n図の下側では、1が短いパルスを作り、それを受けた2が電圧の振動を作ります。右に続く5と6は、その振動の波形を変えて音色を調整します。上側の3と4は2につながり、振動の速さや余韻の長さを変えます。\n\n本文の下線や図の部品・端子を押すと、その周辺を拡大できます。拡大すると、図の右上に「全体表示」が現れます。図の「1 トリガー」など、番号付きの範囲名を押すと、その範囲を拡大できます。',
    detail: {
      title: '図の記号と出典',
      text: '配線の分かれ目にある小さな点は、そこで線がつながっていることを示します。太く表示した線は、いま読んでいる説明でたどる配線です。部品のそばの「C1 15nF」は、C1という名前のコンデンサの容量が15nFという意味です。「Rb 1MΩ」なら、抵抗Rbの値が1MΩだと読めます。\n\nPITCH CVとACCENT CVも外部から電圧を加える入力端子です。CVはControl Voltage（制御電圧）の略です。PITCH CVで音の高さを、ACCENT CVで一打の強さを変えられます。\n\nこの図は、Erica SynthsとMoritz Kleinの『EDU DIY Kick Drum』マニュアルp.2をもとに描き直しました。',
    },
    landmarks: ['GATE IN', 'OUTPUT'],
    focus: ['gate', 'output'], target: 'gate', routes: ['gate', 'output-jack'], stage: 'oscillator',
  },
  {
    readPath: '0/1',
    title: '短いパルスで振動が始まる',
    text: '左下の「1 トリガー」にあるGATE INの電圧を0Vから5Vに上げ、そのままにします。すると、1から2へ送られる電圧は一度上がり、入力がまだ5Vのうちに0V近くまで下がります。このように、短い間だけ電圧が高くなる波形をパルスと呼びます。\n\n1から右へ伸びる太線は、途中の小さな点で上と右に分かれます。右へたどると、抵抗の先に「2 発振回路」の三角形があります。三角形はオペアンプという部品の記号です。左側の＋端子にパルスが入り、右の先端から2の出力を取り出します。\n\n1からのパルスが終わると、2の出力電圧は振動しながら0Vに収束していきます。こうして回路で電圧の振動を作ることを「発振」といいます。振動が速いほど、聞こえる音は高くなります。',
    focus: ['trigger', 'resonator'], target: 'trigger', focusTarget: 'trigger-to-oscillator',
    routes: ['trigger-to-divider', 'osc-input'], nodes: ['branch'], stage: 'oscillator',
  },
  {
    readPath: '1/0',
    title: 'PITCHで音の高さを、DECAYで余韻を変える',
    text: '図の上側にある「2 コンデンサ」も、同じ発振回路の一部です。C1とC2の間から下へ伸びる線をたどると、「3a 音程」のPITCHにつながります。このつまみを回して抵抗値を大きくすると、2の振動が遅くなり、音が低くなります。\n\n今度は「2 発振回路」の三角形の右端（出力）から、太線を上へたどってみます。「3b 減衰」に入り、3bの三角形の右端から、いちばん上の抵抗Rfを通ってC1とC2の間に戻ります。そこから左のC1を通って配線を下へたどると、出発点だった「2 発振回路」のオペアンプの－端子につながります。\n\n2の出力が変わると、3bを通じてコンデンサに流れる電流が変わり、それがまた2の出力に影響します。この働きを「帰還」といいます。\n\nDECAYのつまみで帰還の強さを変えると、2の出力電圧の振れ幅（振幅）が小さくなる速さも変わります。振幅がゆっくり減るほど、余韻は長く残ります。',
    detail: { title: 'PITCHの下の配線はどこへ続く？', text: '「3a 音程」のPITCHから下へたどると、10kΩの抵抗の先に、長さの違う横線を3本重ねた記号があります。これは電圧の基準となるGND（0V）の記号です。' },
    landmarks: ['C1', 'C2', 'PITCH', 'Rf', 'DECAY'],
    focus: ['resonator', 'pitch-decay'], target: 'pitch-decay', focusAreas: ['pitch'],
    routes: ['pitch-ground', 'decay-out', 'decay-return', 'junction-to-minus'], nodes: ['junction'], stage: 'oscillator',
  },
  {
    readPath: '1/1',
    title: '一打の中で音程が下がるしくみ',
    text: '「2 発振回路」の出力を波形にすると、鳴り始めは山と山の間隔が短く、余韻では広くなります。PITCHのつまみを動かしていないのに、なぜ一打の途中で振動が遅くなるのでしょうか。\n\n左下の「1 トリガー」から右に伸びる線をたどると、途中で上にも分かれます。2の振動を始めるパルスは、上の線を通って実線の枠「4a エンベロープ」にも届き、コンデンサCenvを充電します。パルスが終わるとCenvは放電し、両端の電圧は初めは速く、やがてゆっくり下がります。TUNE DECAYで放電を遅くすると、この電圧が長く残ります。\n\n4aの右隣にある破線の枠が「4c 音程制御」です。Cenvの電圧が高い鳴り始めには、4cが2の振動を速めます。どれだけ速めるかを決めるつまみがTUNE DEPTHです。Cenvの電圧が下がるにつれてこの働きが弱まり、振動はPITCHで決めた基準の速さに近づきます。\n\nこうした一打の中での音の高さ（ピッチ）の変化を、ピッチエンベロープと呼びます。',
    detail: {
      title: '4aから発振回路へ、2本の配線をたどる',
      text: '4aの右端から右へたどると、4cの抵抗（100kΩ）の先にトランジスタ（NPN）があります。この部品から上に伸びる線は、2のC1とC2の間につながります。鳴り始めにはトランジスタがここから電流を引き出すため、コンデンサを流れる電流が変わり、2の振動が速くなります。\n\n4aの右端から上へ分かれる線は「4b 平滑化」へ続きます。4bはピッチの急な変化を和らげます。4bの1MΩの抵抗を右へ抜け、縦の線を下へたどると、同じC1とC2の間に着きます。',
      landmarks: ['C1', 'C2', '4b 平滑化'],
    },
    landmarks: ['PITCH', '4a エンベロープ', 'Cenv', 'TUNE DECAY', '4c 音程制御', 'TUNE DEPTH'],
    focus: ['trigger', 'pitch-envelope', 'resonator'], target: 'pitch-envelope', focusAreas: ['envelope','pitch-control'], focusCaption: '4aと4cの範囲を拡大',
    routes: ['envelope-branch', 'envelope-buffer', 'envelope-return'], nodes: ['branch', 'junction'], stage: 'oscillator',
  },
  {
    readPath: '1/2',
    title: 'TONEとDISTORTIONで音色を変える',
    text: '2の三角形の右端から伸びる縦の太線を、今度は下へたどります。行き先は「5 Tone」のTONEです。このつまみで波形の急な変化をなだらかにすると、高い周波数の成分が弱まり、音色が変わります。\n\nTONEの右側で、配線は下のコンデンサと、右の「6 Distortion・出力」に分かれます。右の線は6のオペアンプの＋端子に入ります。DISTORTIONのつまみを回すと、波形の山や谷の形が変わります。6の三角形の右端から線をたどると、一打の音声信号を取り出すOUTPUTに着きます。',
    landmarks: ['TONE', 'DISTORTION', 'OUTPUT'],
    focus: ['resonator', 'tone', 'distortion-output'], target: 'tone', focusTarget: 'oscillator-to-output',
    routes: ['osc-to-tone', 'tone-output', 'output-jack'], stage: 'oscillator',
  },
].map(({readPath,...step})=>({readPath,title:step.title,steps:[step]}));
