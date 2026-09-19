import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/shared/Layout';
import { HomePage } from '@/pages/HomePage';
import { AboutPage } from '@/pages/AboutPage';
import { FindCarePage } from '@/pages/FindCarePage';
import { SpecialistsPage } from '@/pages/SpecialistsPage';
import { DepartmentsPage } from '@/pages/DepartmentsPage';
import { PatientsPage } from '@/pages/PatientsPage';
import { JournalPage } from '@/pages/JournalPage';
import { LocationsPage } from '@/pages/LocationsPage';
import { AppointmentPage } from '@/pages/AppointmentPage';
import { InternationalPatientsPage } from '@/pages/InternationalPatientsPage';
import { InsuranceBillingPage } from '@/pages/InsuranceBillingPage';
import { RouteErrorView } from '@/components/shared/RouteErrorView';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminAnalyticsPage } from '@/pages/AdminAnalyticsPage';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminAppointmentsPage } from '@/pages/admin/AdminAppointmentsPage';
import { AdminDoctorsPage } from '@/pages/admin/AdminDoctorsPage';
import { AdminDepartmentsPage } from '@/pages/admin/AdminDepartmentsPage';
import { AdminSchedulesPage } from '@/pages/admin/AdminSchedulesPage';
import { AdminPatientsPage } from '@/pages/admin/AdminPatientsPage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';
import { AdminAuditPage } from '@/pages/admin/AdminAuditPage';

export const router = createBrowserRouter([
  {
    path: '/admin',
    element: <AdminLayout />,
    errorElement: <RouteErrorView />,
    children: [
      {
        index: true,
        element: <AdminAnalyticsPage />
      },
      {
        path: 'login',
        element: <AdminLoginPage />
      },
      {
        path: 'appointments',
        element: <AdminAppointmentsPage />
      },
      {
        path: 'doctors',
        element: <AdminDoctorsPage />
      },
      {
        path: 'departments',
        element: <AdminDepartmentsPage />
      },
      {
        path: 'schedules',
        element: <AdminSchedulesPage />
      },
      {
        path: 'patients',
        element: <AdminPatientsPage />
      },
      {
        path: 'audit',
        element: <AdminAuditPage />
      },
      {
        path: 'settings',
        element: <AdminSettingsPage />
      },
      {
        path: '*',
        element: <RouteErrorView is404 />
      }
    ]
  },
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteErrorView />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: 'about',
        element: <AboutPage />
      },
      {
        path: 'find-care',
        element: <FindCarePage />
      },
      {
        path: 'specialists',
        element: <SpecialistsPage />
      },
      {
        path: 'departments',
        element: <DepartmentsPage />
      },
      {
        path: 'patients',
        element: <PatientsPage />
      },
      {
        path: 'journal',
        element: <JournalPage />
      },
      {
        path: 'locations',
        element: <LocationsPage />
      },
      {
        path: 'appointment',
        element: <AppointmentPage />
      },
      {
        path: 'international-patients',
        element: <InternationalPatientsPage />
      },
      {
        path: 'insurance-billing',
        element: <InsuranceBillingPage />
      },
      {
        path: '*',
        element: <RouteErrorView is404 />
      }
    ]
  }
]);
