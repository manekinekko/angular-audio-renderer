import { AngularAudioRendererPage } from './app.po';

describe('angular-audio-renderer App', () => {
  let page: AngularAudioRendererPage;

  beforeEach(() => {
    page = new AngularAudioRendererPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
