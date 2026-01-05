import { signal, Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { RuntimeI18nConfig } from '@ngx-runtime-i18n/core';
import { I18nCompatService } from './i18n-compat.service';
import { I18nService } from './i18n.service';
import { RUNTIME_I18N_CONFIG } from './tokens';

type ReadyController = {
  subject: Subject<boolean>;
  signal: Signal<boolean>;
  cleanup: () => void;
};

const createReadyController = (): ReadyController => {
  const subject = new Subject<boolean>();
  const readySignal = signal(false);
  const subscription = subject.subscribe((value) => readySignal.set(value));
  return {
    subject,
    signal: readySignal,
    cleanup: () => {
      subscription.unsubscribe();
      subject.complete();
    },
  };
};

describe('I18nCompatService', () => {
  const runtimeConfig: RuntimeI18nConfig = {
    defaultLang: 'en',
    supported: ['en'],
    fetchCatalog: () => Promise.resolve({}),
  };

  let service: I18nCompatService;
  let readyController: ReadyController;

  beforeEach(() => {
    readyController = createReadyController();
    const fakeI18nService: Partial<I18nService> = {
      ready: readyController.signal,
      lang: signal('en'),
      t: () => '',
      setLang: () => Promise.resolve(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: RUNTIME_I18N_CONFIG, useValue: runtimeConfig },
        { provide: I18nService, useValue: fakeI18nService as I18nService },
      ],
    });

    service = TestBed.inject(I18nCompatService);
  });

  afterEach(() => {
    readyController.cleanup();
    TestBed.resetTestingModule();
  });

  it('waits for the first true ready value', async () => {
    let resolved = false;
    const readyPromise = service.whenReady().then(() => {
      resolved = true;
    });

    readyController.subject.next(false);
    await Promise.resolve();
    expect(resolved).toBe(false);

    readyController.subject.next(true);
    await readyPromise;
    expect(resolved).toBe(true);
  });

  it('resolves immediately when ready starts true', async () => {
    readyController.subject.next(true);
    await expect(service.whenReady()).resolves.toBeUndefined();
  });
});
