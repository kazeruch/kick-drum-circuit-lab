import {COURSE_CHAPTERS} from './course.js';
import {initOverviewMap} from './overview-map.js';
import {initSidebar} from './sidebar.js';

const chapter = COURSE_CHAPTERS[0];
const sections = chapter.sections;
const menu = document.getElementById('lesson-menu');
const links = [];
let current = 0;

function sectionHash(index) {
  return '#read/overview/detail/' + sections[index].readPath;
}

function sectionFromURL() {
  return Math.max(0, sections.findIndex((_, index) => sectionHash(index) === location.hash));
}

function makeButton(number, title) {
  const button = document.createElement('button');
  button.type = 'button';
  for (const text of [number, title]) {
    const span = document.createElement('span');
    span.textContent = text;
    button.append(span);
  }
  return button;
}

const overviewItem = document.createElement('li');
const overviewButton = makeButton(chapter.marker, chapter.title);
overviewButton.setAttribute('aria-current', 'page');
overviewButton.addEventListener('click', () => select(0));
const sectionList = document.createElement('ol');
sectionList.className = 'course-sections';
sections.forEach((section, index) => {
  const item = document.createElement('li');
  const button = makeButton('0.' + (index + 1), section.title);
  button.firstElementChild.className = 'course-section-number';
  button.addEventListener('click', () => select(index));
  links.push(button);
  item.append(button);
  sectionList.append(item);
});
overviewItem.append(overviewButton, sectionList);
menu.append(overviewItem);

const planned = COURSE_CHAPTERS.slice(1).map(item => item.marker + ' ' + item.title);
for (const title of [...planned, '全体回路を試す']) {
  const item = document.createElement('li');
  item.className = 'planned-chapter';
  const status = document.createElement('small');
  status.textContent = '公開予定';
  item.append(title, status);
  menu.append(item);
}

function show(index, moveFocus) {
  current = index;
  map.setStep(chapter, sections[index].steps[0], {section: index});
  map.getElement('lesson-previous-bottom').disabled = index === 0;
  links.forEach((button, i) => {
    if (i === index) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  if (moveFocus) {
    closeMobileSidebar();
    const heading = map.getElement('lesson-title');
    heading.tabIndex = -1;
    heading.focus({preventScroll: true});
  }
}

function select(index) {
  if (location.hash === sectionHash(index)) show(index, true);
  else location.hash = sectionHash(index);
}

const closeMobileSidebar = initSidebar();
const map = initOverviewMap({
  container: document.getElementById('full-circuit-map'),
  chapters: COURSE_CHAPTERS,
  onPrevious: () => select(Math.max(0, current - 1)),
  onNext: () => select((current + 1) % sections.length),
});

map.setVisible(true);
show(sectionFromURL(), false);
window.addEventListener('hashchange', () => {
  if (location.hash !== '#simulator-panel') show(sectionFromURL(), true);
});
