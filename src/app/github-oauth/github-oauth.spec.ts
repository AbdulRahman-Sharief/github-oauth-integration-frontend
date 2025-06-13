import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GithubOauth } from './github-oauth';

describe('GithubOauth', () => {
  let component: GithubOauth;
  let fixture: ComponentFixture<GithubOauth>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GithubOauth]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GithubOauth);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
