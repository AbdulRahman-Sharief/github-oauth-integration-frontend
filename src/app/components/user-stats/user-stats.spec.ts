import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserStats } from './user-stats';

describe('UserStats', () => {
  let component: UserStats;
  let fixture: ComponentFixture<UserStats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserStats]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserStats);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
