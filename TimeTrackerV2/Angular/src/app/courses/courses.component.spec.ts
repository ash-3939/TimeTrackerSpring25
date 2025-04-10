/*
##########################   MY WORK BELOW   ####################################
TESTS: 
Component Creation Test
Initialization Test
Course Loading Test
Successful Registration Test
Failed Registration Test
Search Courses Test
Run the test with ng test
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoursesComponent } from './courses.component';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';

beforeEach(async () => {
  await TestBed.configureTestingModule({
    declarations: [CoursesComponent],
    providers: [
      {
        provide: HttpClient,
        useValue: {
          get: (url: string) => {
            if (url.includes('getUserCourses')) {
              return of([]); // Mock empty array
            }
            if (url.includes('getNonUserCourses')) {
              return of([]); // Mock empty array
            }
            if (url.includes('getCoursesPendCourses')) {
              return of([]); // Mock empty array
            }
            return of([]);
          },
          post: () => of({}),
        },
      },
    ],
  }).compileComponents();
});

describe('CoursesComponent', () => {
  let component: CoursesComponent;
  let fixture: ComponentFixture<CoursesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CoursesComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CoursesComponent);
    component = fixture.componentInstance;

    // Mock the currentUser property
    component.currentUser = { userID: 1 }; // Mock userID

    fixture.detectChanges();
  });

  // Component Creation Test
  it('Should create the component', () => {
    expect(component).toBeTruthy();
  });

  // Initialization Test
  it('Should initialize the component', () => {
    expect(component.pageTitle).toBe('TimeTrackerV2 | Courses');
    expect(component.errMsg).toBe('');
    expect(component.courses).toEqual([]);
    expect(component.allUserCourses).toEqual([]); // Should be empty
    expect(component.nonUserCourses).toEqual([]); // Should be empty
    expect(component.PendUserCourses).toEqual([]); // Should be empty
    expect(component.searchQuery).toBe('');
  });

  // Course Loading Test
  it('Should load courses successfully', () => {
    spyOn(component, 'loadAllUserCourses').and.callThrough();
    spyOn(component, 'loadNonUserCourses').and.callThrough();
    spyOn(component, 'loadPenUserCourses').and.callThrough();

    component.loadCourses();

    expect(component.loadAllUserCourses).toHaveBeenCalled();
    expect(component.loadNonUserCourses).toHaveBeenCalled();
    expect(component.loadPenUserCourses).toHaveBeenCalled();
  });

  // Successful Registration Test
  it('Should register a user to a course successfully', () => {
    spyOn(component, 'loadCourses').and.callThrough();
    const courseId = 101;

    component.register(courseId);

    expect(component.errMsg).toBe('');
    expect(component.loadCourses).toHaveBeenCalled();
  });

  // Failed Registration Test
  it('Should handle registration failure', () => {
    spyOn(component, 'loadCourses').and.callThrough();
    const courseId = null; // Invalid course ID

    component.register(courseId);

    expect(component.errMsg).toBe('Missing one or more required arguments');
    expect(component.loadCourses).not.toHaveBeenCalled();
  });

  // Search Courses Test
  it('Should not filter courses if search query is empty', () => {
    component.nonUserCourses = []; // Empty array
    component.allUserCourses = []; // Empty array
    component.searchQuery = ''; // Empty search query

    component.searchCourses();

    expect(component.nonUserFilteredCourses).toEqual([]);
    expect(component.allUserFilteredCourses).toEqual([]);
  });

  it('Should filter courses based on search query', () => {
    component.nonUserCourses = [
      { courseName: 'Math 101' },
      { courseName: 'History 101' },
    ];
    component.allUserCourses = [
      { courseName: 'Math 101' },
      { courseName: 'Science 102' },
    ];

    component.searchQuery = 'Math';
    component.searchCourses();

    expect(component.nonUserFilteredCourses).toEqual([
      { courseName: 'Math 101' },
    ]);
    expect(component.allUserFilteredCourses).toEqual([
      { courseName: 'Math 101' },
    ]);
  });
});
