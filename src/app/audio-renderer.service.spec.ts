import { TestBed, inject } from '@angular/core/testing';

import { AudioRendererService } from './audio-renderer.service';

describe('AudioRendererService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AudioRendererService]
    });
  });

  it('should ...', inject([AudioRendererService], (service: AudioRendererService) => {
    expect(service).toBeTruthy();
  }));
});
