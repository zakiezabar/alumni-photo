import Link from 'next/link';
import React from 'react';
import { UserButton} from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { FcGoogle } from 'react-icons/fc';

const Navbar = async() => {
  const { userId } = await auth();
  const isAuth = !!userId;

  return (
    <div>
      <ul className='flex items-center justify-between h-16 p-4 bg-white text-black relative shadow-sm'>
          <div>
            <Link href="/">
              <li>Home</li>
            </Link>
          </div>
          <div className='flex gap-4'>
            {!isAuth ? (
              <>
                <Link href="/sign-in">
                  <div className='flex gap-2 items-center border-2 border-slate-100 p-2 rounded-xl'>
                    <FcGoogle className='text-2xl'/>
                    <li>Login using google</li>
                  </div>
                </Link>
              </>
            ) : (
              <>
                <Link href="/profile">
                  <li>Profile</li>
                </Link>
                <li>
                  <UserButton />
                </li>
              </>
            )}
          </div>
      </ul>
    </div>
  );
}

export default Navbar;
